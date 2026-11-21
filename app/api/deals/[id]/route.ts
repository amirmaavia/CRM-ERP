import { secureRoute } from "@/lib/http/secure-route";
import { ActivityAction, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext, verifyOwnership } from "@/lib/http/api";
import { dealUpdateSchema } from "@/lib/validations/work";

async function handlePATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;
  const parsed = dealUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid deal details" }, { status: 400 });

  const existing = await prisma.deal.findUnique({ where: { id: params.id }, select: { userId: true } });
  try {
    verifyOwnership(existing, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const x = parsed.data;
    const deal = await prisma.deal.update({
      where: { id: params.id },
      data: { ...x, value: x.value === undefined ? undefined : new Prisma.Decimal(x.value), expectedCloseDate: x.expectedCloseDate ? new Date(x.expectedCloseDate) : x.expectedCloseDate === null ? null : undefined, contactId: x.contactId || undefined, ownerId: x.ownerId || undefined },
    });
    await prisma.activityLog.create({ data: { userId, action: ActivityAction.UPDATE, entityType: "Deal", entityId: deal.id, description: `Moved/updated deal ${deal.title}` } });
    return NextResponse.json({ ...deal, value: Number(deal.value) });
  } catch (e) {
    return apiError(e);
  }
}

async function handleDELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;

  const existing = await prisma.deal.findUnique({ where: { id: params.id }, select: { userId: true } });
  try {
    verifyOwnership(existing, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.deal.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Deal deleted" });
  } catch (e) {
    return apiError(e);
  }
}
export const PATCH = secureRoute("crm.write", handlePATCH);

export const DELETE = secureRoute("crm.write", handleDELETE);
