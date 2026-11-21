import { ActivityAction, Prisma, RoleName } from "@prisma/client";
import { NextResponse } from "next/server";
import { canAssignRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { apiError, requirePlatformAdmin } from "@/lib/http/api";
import { updateUserSchema } from "@/lib/validations/auth";
import { updateAuthUser } from "@/lib/auth/supabase-admin";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;
  const parsed = updateUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid user details", fields: parsed.error.flatten().fieldErrors }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: params.id }, include: { role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role.name === RoleName.PLATFORM_ADMIN && auth.session.user.role !== RoleName.PLATFORM_ADMIN) return NextResponse.json({ error: "Only a platform admin can manage this account" }, { status: 403 });
  if (parsed.data.role && !canAssignRole(auth.session.user.role, parsed.data.role)) return NextResponse.json({ error: "You cannot assign that role" }, { status: 403 });
  if (params.id === auth.session.user.id && parsed.data.role && parsed.data.role !== auth.session.user.role) return NextResponse.json({ error: "You cannot change your own administrator role" }, { status: 400 });
  if (params.id === auth.session.user.id && parsed.data.status && parsed.data.status !== "ACTIVE") return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });

  try {
    const role = parsed.data.role ? await prisma.role.findUniqueOrThrow({ where: { name: parsed.data.role } }) : undefined;
    if (target.supabaseAuthId && (parsed.data.password || parsed.data.status || parsed.data.name)) await updateAuthUser(target.supabaseAuthId, { password: parsed.data.password, banned: parsed.data.status ? parsed.data.status !== "ACTIVE" : undefined, name: parsed.data.name });
    const user = await prisma.user.update({
      where: { id: params.id },
      data: { name: parsed.data.name, status: parsed.data.status, roleId: role?.id },
      select: { id: true, name: true, email: true, status: true, role: { select: { name: true } } },
    });
    await prisma.activityLog.create({ data: { userId: auth.session.user.id, action: ActivityAction.UPDATE, entityType: "User", entityId: user.id, description: `Updated user ${user.email}` } });
    return NextResponse.json(user);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;
  if (params.id === auth.session.user.id) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: params.id }, include: { role: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.role.name === RoleName.PLATFORM_ADMIN && auth.session.user.role !== RoleName.PLATFORM_ADMIN) return NextResponse.json({ error: "Only a platform admin can manage this account" }, { status: 403 });

  try {
    if (target.supabaseAuthId) await updateAuthUser(target.supabaseAuthId, { banned: true });
    await prisma.$transaction([
      prisma.user.update({ where: { id: params.id }, data: { status: "INACTIVE" } }),
      prisma.activityLog.create({ data: { userId: auth.session.user.id, action: ActivityAction.DELETE, entityType: "User", entityId: params.id, description: `Deactivated user ${target.email}` } }),
    ]);
    return NextResponse.json({ message: "User deactivated" });
  } catch (error) {
    return apiError(error);
  }
}
