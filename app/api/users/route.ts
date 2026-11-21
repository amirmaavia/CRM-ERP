import { ActivityAction, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { canAssignRole } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { apiError, requirePlatformAdmin } from "@/lib/http/api";
import { createUserSchema } from "@/lib/validations/auth";
import { createAuthUser, deleteAuthUser } from "@/lib/auth/supabase-admin";

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(Math.max(Number(url.searchParams.get("pageSize")) || 10, 1), 100);
  const search = url.searchParams.get("search")?.trim();
  const tenantId = auth.session.user.tenantId ?? auth.session.user.id;
  const where: Prisma.UserWhereInput = { ...(search ? { AND: [{ OR: [{ name: { contains: search } }, { email: { contains: search } }] }] } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: { id: true, name: true, email: true, status: true, createdAt: true, role: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.user.count({ where }),
  ]);
  return NextResponse.json({ items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;
  const parsed = createUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid user details", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  if (!canAssignRole(auth.session.user.role, parsed.data.role)) return NextResponse.json({ error: "You cannot assign that role" }, { status: 403 });
  try {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: parsed.data.role } });
    const tenantId = auth.session.user.tenantId ?? auth.session.user.id;
    const supabaseAuthId = await createAuthUser(parsed.data.email, parsed.data.password, parsed.data.name);
    let user;
    try { user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: parsed.data.name, email: parsed.data.email, supabaseAuthId, roleId: role.id,
          accountOwnerId: parsed.data.workspace === "SHARED" ? tenantId : null,
          notificationPreference: { create: {} },
          ...(parsed.data.workspace === "INDEPENDENT" ? { companySettings: { create: { companyName: `${parsed.data.name}'s Business` } } } : {}),
        },
        select: { id: true, name: true, email: true, status: true, role: { select: { name: true } } },
      });
      await tx.activityLog.create({ data: { userId: auth.session.user.id, action: ActivityAction.CREATE, entityType: "User", entityId: created.id, description: `Created ${parsed.data.workspace.toLowerCase()} account` } });
      return created;
    });
    } catch (error) { await deleteAuthUser(supabaseAuthId).catch(() => undefined); throw error; }
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    return apiError(error);
  }
}
