import { Prisma, ActivityAction } from "@prisma/client";
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
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional(),
    action: z.nativeEnum(ActivityAction).optional(),
    entityType: z.string().max(100).optional(),
    userId: z.string().max(191).optional(),
    failures: z.enum(["true"]).optional(),
  }).safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid activity filters" }, { status: 400 });
  const { page, pageSize, search, action, entityType, userId, failures } = parsed.data;

  const where: Prisma.ActivityLogWhereInput = {
    ...(failures ? { OR: [{ entityType: "AuthenticationFailure" }, { entityType: "ApiRequest", newValues: { path: ["status"], gte: 400 } }] } : {}),
    ...(search ? { description: { contains: search } } : {}),
    ...(action ? { action: action } : {}),
    ...(userId ? { userId } : {}),
    ...(entityType ? { entityType } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.activityLog.findMany({
      where,
      select: { id: true, action: true, entityType: true, entityId: true, description: true, createdAt: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return NextResponse.json({ items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
}
