import { ALL_BUSINESS_KEYS, BUSINESS_ACCESS, effectiveBusinessPermissions, permissionsForAccess } from "@/lib/auth/business-access";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/http/api";
import { requireBusinessOwner, getStaffRoles } from "@/lib/auth/business-owner";
import { createUserSchema } from "@/lib/validations/auth";
import { createAuthUser, deleteAuthUser } from "@/lib/auth/supabase-admin";

export async function GET(request: Request) {
  const auth = await requireBusinessOwner();
  if (auth.error) return auth.error;
  const parsed = z.object({ page: z.coerce.number().int().min(1).default(1), search: z.string().trim().default("") }).safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  const { page, search } = parsed.data;
  const where = { accountOwnerId: auth.owner.id, role: { name: { not: "PLATFORM_ADMIN" as const } }, ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: { id: true, name: true, email: true, status: true, createdAt: true, businessAccess: true, role: { select: { name: true, permissions: { include: { permission: true } } } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * 10, take: 10 }),
    prisma.user.count({ where }),
  ]);
  return NextResponse.json({ items: items.map(user => {
    const effective = effectiveBusinessPermissions(user.role.permissions.map(({ permission }) => permission.key), user.businessAccess, false, false);
    return { ...user, role: { name: user.role.name }, businessAccess: Array.isArray(user.businessAccess) ? user.businessAccess : BUSINESS_ACCESS.filter(group => group.permissions.every(key => effective.includes(key))).map(group => group.key) };
  }), pagination: { page, total, pages: Math.ceil(total / 10) } });
}

export async function POST(request: Request) {
  const auth = await requireBusinessOwner();
  if (auth.error) return auth.error;
  const parsed = createUserSchema.omit({ workspace: true }).extend({ businessAccess: z.array(z.string().refine(key => ALL_BUSINESS_KEYS.includes(key as any))).max(20).optional() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sub-user details" }, { status: 400 });
  if (parsed.data.businessAccess && permissionsForAccess(parsed.data.businessAccess).some(key => !auth.session.user.permissions.includes(key))) return NextResponse.json({ error: "Access exceeds your own permissions" }, { status: 403 });
  const role = parsed.data.businessAccess ? (parsed.data.role === "USER" ? await prisma.role.findUnique({ where: { name: "USER" } }) : null) : (await getStaffRoles(auth.session.user.permissions)).find(role => role.name === parsed.data.role);
  if (!role) return NextResponse.json({ error: "This staff role exceeds your allowed access" }, { status: 403 });
  try {
    const supabaseAuthId = await createAuthUser(parsed.data.email, parsed.data.password, parsed.data.name);
    let user;
    try { user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({ data: { name: parsed.data.name, email: parsed.data.email, supabaseAuthId, roleId: role.id, businessAccess: parsed.data.businessAccess, accountOwnerId: auth.owner.id, notificationPreference: { create: {} } }, select: { id: true, name: true, email: true, status: true, role: { select: { name: true } } } });
      await tx.activityLog.create({ data: { userId: auth.session.user.id, action: "CREATE", entityType: "User", entityId: created.id, description: "Created business sub-user" } });
      return created;
    });
    } catch (error) { await deleteAuthUser(supabaseAuthId).catch(() => undefined); throw error; }
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Email is already in use" }, { status: 409 });
    return apiError(error);
  }
}
