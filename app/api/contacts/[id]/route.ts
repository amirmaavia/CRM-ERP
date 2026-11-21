import { secureRoute } from "@/lib/http/secure-route";
import { ActivityAction } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext, verifyOwnership } from "@/lib/http/api";
import { contactUpdateSchema } from "@/lib/validations/crm";

async function handleGET(_: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;

  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      company: { include: { supplierProfile: { select: { id: true } } } },
      notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      deals: { orderBy: { updatedAt: "desc" } },
      invoices: { orderBy: { issueDate: "desc" }, take: 500 },
      payments: { orderBy: { paymentDate: "desc" }, take: 500 },
    },
  });

  try {
    verifyOwnership(contact, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invoices = contact.invoices.map((invoice) => ({
    ...invoice,
    subtotal: Number(invoice.subtotal),
    taxTotal: Number(invoice.taxTotal),
    discountTotal: Number(invoice.discountTotal),
    total: Number(invoice.total),
    paidAmount: Number(invoice.paidAmount),
  }));
  const payments = contact.payments.map((payment) => ({ ...payment, amount: Number(payment.amount) }));
  const validInvoices = invoices.filter((invoice) => invoice.status !== "VOID");
  const incomingPayments = payments.filter((payment) => payment.direction === "IN");
  const ledger = [
    ...validInvoices.map((invoice) => ({
      id: invoice.id,
      date: invoice.issueDate,
      reference: invoice.number,
      description: invoice.type === "CASH_SALE" ? "Cash sale / customer purchase" : "Credit sale / customer purchase",
      debit: invoice.total,
      credit: 0,
      invoiceId: invoice.id,
      order: 0,
    })),
    ...payments.map((payment) => ({
      id: payment.id,
      date: payment.paymentDate,
      reference: payment.number,
      description: payment.direction === "IN" ? `Customer payment (${payment.method.replaceAll("_", " ")})` : `Payment out (${payment.method.replaceAll("_", " ")})`,
      debit: payment.direction === "OUT" ? payment.amount : 0,
      credit: payment.direction === "IN" ? payment.amount : 0,
      order: 1,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.order - b.order).map(((balance) => (entry) => ({ ...entry, runningBalance: balance += entry.debit - entry.credit }))(0));

  return NextResponse.json({
    ...contact,
    currentBalance: Number(contact.currentBalance),
    deals: contact.deals.map((deal) => ({ ...deal, value: Number(deal.value) })),
    invoices,
    payments,
    ledger,
    summary: {
      totalPurchased: validInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
      cashPurchased: validInvoices.filter((invoice) => invoice.type === "CASH_SALE").reduce((sum, invoice) => sum + invoice.total, 0),
      creditPurchased: validInvoices.filter((invoice) => invoice.type === "CREDIT_SALE").reduce((sum, invoice) => sum + invoice.total, 0),
      totalPaid: incomingPayments.reduce((sum, payment) => sum + payment.amount, 0),
      outstanding: Number(contact.currentBalance),
      invoiceCount: validInvoices.length,
      paymentCount: incomingPayments.length,
    },
  });
}

async function handlePATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;
  const parsed = contactUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid contact details" }, { status: 400 });

  const existing = await prisma.contact.findUnique({ where: { id: params.id }, select: { userId: true } });
  try {
    verifyOwnership(existing, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const contact = await prisma.contact.update({
      where: { id: params.id },
      data: { ...parsed.data, email: parsed.data.email || null, companyId: parsed.data.companyId || null },
    });
    await prisma.activityLog.create({ data: { userId, action: ActivityAction.UPDATE, entityType: "Contact", entityId: contact.id, description: `Updated customer ${contact.firstName}` } });
    return NextResponse.json({ ...contact, currentBalance: Number(contact.currentBalance) });
  } catch (error) {
    return apiError(error);
  }
}

async function handleDELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;

  const existing = await prisma.contact.findUnique({ where: { id: params.id }, select: { userId: true } });
  try {
    verifyOwnership(existing, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const contact = await prisma.contact.update({ where: { id: params.id }, data: { status: "INACTIVE" } });
    await prisma.activityLog.create({ data: { userId, action: ActivityAction.DELETE, entityType: "Contact", entityId: contact.id, description: `Deactivated customer ${contact.firstName}` } });
    return NextResponse.json({ message: "Customer deactivated" });
  } catch (error) {
    return apiError(error);
  }
}
export const GET = secureRoute("crm.read", handleGET);

export const PATCH = secureRoute("crm.write", handlePATCH);

export const DELETE = secureRoute("crm.write", handleDELETE);
