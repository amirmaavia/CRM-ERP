import { Prisma, RoleName, UserStatus } from "@prisma/client";
import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, requirePlatformAdmin } from "@/lib/http/api";

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const parsed = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    registeredFrom: z.string().date().optional(),
    registeredTo: z.string().date().optional(),
    activeSince: z.string().date().optional(),
    status: z.nativeEnum(UserStatus).optional(),
    role: z.nativeEnum(RoleName).optional(),
    sort: z.enum(["createdAt", "name", "email", "status"]).default("createdAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
  }).safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid user filters" }, { status: 400 });
  const { page, pageSize, search, status, role, sort, order, registeredFrom, registeredTo, activeSince } = parsed.data;

  if (registeredFrom && registeredTo && registeredFrom > registeredTo) return NextResponse.json({ error: "Registration date range is invalid" }, { status: 400 });
  const where: Prisma.UserWhereInput = {
    ...(registeredFrom || registeredTo ? { createdAt: { ...(registeredFrom ? { gte: new Date(registeredFrom) } : {}), ...(registeredTo ? { lte: new Date(registeredTo + "T23:59:59.999Z") } : {}) } } : {}),
    ...(activeSince ? { activityLogs: { some: { createdAt: { gte: new Date(activeSince) } } } } : {}),
    ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }, { id: { contains: search } }] } : {}),
    ...(status ? { status: status } : {}),
    ...(role ? { role: { name: role } } : {}),
  };

  const orderBy: Prisma.UserOrderByWithRelationInput = { [sort]: order };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        role: { select: { name: true } },
        _count: { select: { leads: true, deals: true, createdInvoices: true, tenantLeads: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  const ids = items.map((user) => user.id);
  const [logins, activity] = await Promise.all([
    prisma.activityLog.groupBy({ by: ["userId"], where: { userId: { in: ids }, action: "LOGIN", entityType: "User" }, _max: { createdAt: true } }),
    prisma.activityLog.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _max: { createdAt: true } }),
  ]);
  return NextResponse.json({ items: items.map((user) => ({ ...user, lastLoginAt: logins.find((log) => log.userId === user.id)?._max.createdAt, lastActivityAt: activity.find((log) => log.userId === user.id)?._max.createdAt })), pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
}