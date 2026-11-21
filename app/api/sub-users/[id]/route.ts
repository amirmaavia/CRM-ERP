import { z } from "zod";
import { ALL_BUSINESS_KEYS, permissionsForAccess } from "@/lib/auth/business-access";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireBusinessOwner, getStaffRoles } from "@/lib/auth/business-owner";
import { updateUserSchema } from "@/lib/validations/auth";
import { updateAuthUser } from "@/lib/auth/supabase-admin";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireBusinessOwner();
  if (auth.error) return auth.error;
  const parsed = updateUserSchema.pick({ role: true, status: true }).extend({ businessAccess: z.array(z.string().refine(key => ALL_BUSINESS_KEYS.includes(key as any))).max(20).optional() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid access details" }, { status: 400 });
  if (params.id === auth.session.user.id) return NextResponse.json({ error: "You cannot change your own management access" }, { status: 403 });
  if (parsed.data.businessAccess && permissionsForAccess(parsed.data.businessAccess).some(key => !auth.session.user.permissions.includes(key))) return NextResponse.json({ error: "Access exceeds your own permissions" }, { status: 403 });
  const role = parsed.data.role ? (await getStaffRoles(auth.session.user.permissions)).find(role => role.name === parsed.data.role) : undefined;
  if (parsed.data.role && !role) return NextResponse.json({ error: "This staff role exceeds your allowed access" }, { status: 403 });
  const target = await prisma.user.findFirst({ where: { id: params.id, accountOwnerId: auth.owner.id, role: { name: { not: "PLATFORM_ADMIN" } } }, select: { supabaseAuthId: true } });
  if (!target) return NextResponse.json({ error: "Sub-user not found" }, { status: 404 });
  if (target.supabaseAuthId && parsed.data.status) await updateAuthUser(target.supabaseAuthId, { banned: parsed.data.status !== "ACTIVE" });
  const count = await prisma.$transaction(async tx => {
    const updated = await tx.user.updateMany({ where: { id: params.id, accountOwnerId: auth.owner.id, role: { name: { not: "PLATFORM_ADMIN" } } }, data: { status: parsed.data.status, roleId: role?.id, businessAccess: parsed.data.businessAccess } });
    if (updated.count) await tx.activityLog.create({ data: { userId: auth.session.user.id, action: "UPDATE", entityType: "User", entityId: params.id, description: "Updated business sub-user access" } });
    return updated.count;
  });
  return count ? NextResponse.json({ message: "Sub-user updated" }) : NextResponse.json({ error: "Sub-user not found" }, { status: 404 });
}
