import { secureRoute } from "@/lib/http/secure-route";
import { ActivityAction } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext, verifyOwnership } from "@/lib/http/api";

async function handlePOST(_: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;

  const lead = await prisma.lead.findUnique({ where: { id: params.id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  try {
    verifyOwnership(lead, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (lead.convertedContactId) return NextResponse.json({ error: "Lead is already converted" }, { status: 409 });

  const contact = await prisma.$transaction(async (tx) => {
    const created = await tx.contact.create({ data: { firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: lead.phone, companyId: lead.companyId, userId } });
    await tx.lead.update({ where: { id: lead.id }, data: { status: "CONVERTED", convertedContactId: created.id } });
    await tx.activityLog.create({ data: { userId, action: ActivityAction.CONVERT, entityType: "Lead", entityId: lead.id, description: `Converted lead ${lead.firstName} to customer` } });
    return created;
  });
  return NextResponse.json({ contactId: contact.id });
}
export const POST = secureRoute("crm.write", handlePOST);
