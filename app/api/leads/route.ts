import { secureRoute } from "@/lib/http/secure-route";
import { ActivityAction, LeadStatus, Prisma, RoleName } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext, verifyOwnership } from "@/lib/http/api";
import { leadSchema } from "@/lib/validations/crm";

async function handleGET(request: Request) {
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;
  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(Number(url.searchParams.get("pageSize")) || 10, 100);
  const search = url.searchParams.get("search")?.trim();
  const status = url.searchParams.get("status") as LeadStatus | null;

  const where: Prisma.LeadWhereInput = {
    userId,
    ...(status && Object.values(LeadStatus).includes(status) ? { status } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({ items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
}

async function handlePOST(request: Request) {
  const auth = await getTenantContext();
  const { userId, actorId } = auth;
  const parsed = leadSchema.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid lead details", fields: parsed.error.flatten().fieldErrors }, { status: 400 });

  try {
    const lead = await prisma.lead.create({
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
        companyId: parsed.data.companyId || null,
        assignedToId: parsed.data.assignedToId || actorId,
        userId,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        company: true,
      },
    });
    await prisma.activityLog.create({
      data: { userId, action: ActivityAction.CREATE, entityType: "Lead", entityId: lead.id, description: `Created lead ${lead.firstName}` },
    });
    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export const GET = secureRoute("crm.read", handleGET);

export const POST = secureRoute("crm.write", handlePOST);
