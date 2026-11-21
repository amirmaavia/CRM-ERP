import { secureRoute } from "@/lib/http/secure-route";
import { ActivityAction } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext, verifyOwnership } from "@/lib/http/api";
import { leadUpdateSchema } from "@/lib/validations/crm";

async function handlePATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;
  const parsed = leadUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid lead details" }, { status: 400 });

  const existing = await prisma.lead.findUnique({ where: { id: params.id }, select: { userId: true } });
  try {
    verifyOwnership(existing, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: { ...parsed.data, email: parsed.data.email || null, companyId: parsed.data.companyId || null, assignedToId: parsed.data.assignedToId || null },
    });
    await prisma.activityLog.create({ data: { userId, action: ActivityAction.UPDATE, entityType: "Lead", entityId: lead.id, description: `Updated lead ${lead.firstName}` } });
    return NextResponse.json(lead);
  } catch (error) {
    return apiError(error);
  }
}

async function handleDELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;

  const existing = await prisma.lead.findUnique({ where: { id: params.id }, select: { userId: true } });
  try {
    verifyOwnership(existing, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.lead.delete({ where: { id: params.id } });
    await prisma.activityLog.create({ data: { userId, action: ActivityAction.DELETE, entityType: "Lead", entityId: params.id, description: "Deleted lead" } });
    return NextResponse.json({ message: "Lead deleted" });
  } catch (error) {
    return apiError(error);
  }
}
export const PATCH = secureRoute("crm.write", handlePATCH);

export const DELETE = secureRoute("crm.write", handleDELETE);
