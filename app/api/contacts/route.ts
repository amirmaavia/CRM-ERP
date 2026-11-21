import { secureRoute } from "@/lib/http/secure-route";
import { ActivityAction, Prisma, ContactStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext } from "@/lib/http/api";
import { contactSchema } from "@/lib/validations/crm";

async function handleGET(request: Request) {
  const auth = await getTenantContext();
  const { userId } = auth;
  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(Number(url.searchParams.get("pageSize")) || 10, 100);
  const search = url.searchParams.get("search")?.trim();
  const status = url.searchParams.get("status") as ContactStatus | null;
  const companyId = url.searchParams.get("companyId");

  const where: Prisma.ContactWhereInput = {
    userId,
    ...(status && Object.values(ContactStatus).includes(status) ? { status } : {}),
    ...(companyId ? { companyId } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { company: { name: { contains: search } } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.contact.findMany({
      where,
      include: { company: { select: { id: true, name: true } }, _count: { select: { invoices: true, deals: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({ items: items.map((item) => ({ ...item, currentBalance: Number(item.currentBalance) })), pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
}

async function handlePOST(request: Request) {
  const auth = await getTenantContext();
  const { userId } = auth;
  const parsed = contactSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid contact details", fields: parsed.error.flatten().fieldErrors }, { status: 400 });

  try {
    const contact = await prisma.contact.create({
      data: { ...parsed.data, email: parsed.data.email || null, companyId: parsed.data.companyId || null, tags: parsed.data.tags, userId },
      include: { company: true },
    });
    await prisma.activityLog.create({
      data: { userId, action: ActivityAction.CREATE, entityType: "Contact", entityId: contact.id, description: `Created customer ${contact.firstName} ${contact.lastName ?? ""}`.trim() },
    });
    return NextResponse.json({ ...contact, currentBalance: Number(contact.currentBalance) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
export const GET = secureRoute("crm.read", handleGET);

export const POST = secureRoute("crm.write", handlePOST);
