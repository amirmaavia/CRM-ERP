import { secureRoute } from "@/lib/http/secure-route";
import { ActivityAction, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext } from "@/lib/http/api";
import { dealSchema } from "@/lib/validations/work";

const select = {
  id: true,
  title: true,
  value: true,
  stage: true,
  probability: true,
  expectedCloseDate: true,
  position: true,
  contact: { select: { id: true, firstName: true, lastName: true } },
  owner: { select: { id: true, name: true } },
} satisfies Prisma.DealSelect;

async function handleGET() {
  const auth = await getTenantContext();
  const { userId } = auth;
  const items = await prisma.deal.findMany({
    where: { userId },
    select,
    orderBy: [{ stage: "asc" }, { position: "asc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json(items.map((x) => ({ ...x, value: Number(x.value) })));
}

async function handlePOST(request: Request) {
  const auth = await getTenantContext();
  const { userId } = auth;
  const parsed = dealSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid deal details" }, { status: 400 });

  try {
    const x = parsed.data;
    const deal = await prisma.deal.create({
      data: { ...x, value: new Prisma.Decimal(x.value), expectedCloseDate: x.expectedCloseDate ? new Date(x.expectedCloseDate) : null, contactId: x.contactId || null, ownerId: x.ownerId || userId, userId },
      select,
    });
    await prisma.activityLog.create({ data: { userId, action: ActivityAction.CREATE, entityType: "Deal", entityId: deal.id, description: `Created deal ${deal.title}` } });
    return NextResponse.json({ ...deal, value: Number(deal.value) }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
export const GET = secureRoute("crm.read", handleGET);

export const POST = secureRoute("crm.write", handlePOST);
