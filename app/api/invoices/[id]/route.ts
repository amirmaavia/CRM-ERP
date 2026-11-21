import { secureRoute } from "@/lib/http/secure-route";
import { ActivityAction, InvoiceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext, verifyOwnership } from "@/lib/http/api";

async function handleGET(_: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, actorId, isPlatformAdmin } = auth;

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { contact: true, items: { include: { product: true } }, paymentAllocations: { include: { payment: true } }, createdBy: { select: { name: true } } },
  });

  try {
    verifyOwnership(invoice, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.companySetting.findUnique({ where: { userId: invoice.userId }, select: { companyName: true, email: true, phone: true, address: true, logoUrl: true, currency: true, taxNumber: true, watermarkText: true } });

  return NextResponse.json({
    ...invoice,
    subtotal: Number(invoice.subtotal),
    taxTotal: Number(invoice.taxTotal),
    discountTotal: Number(invoice.discountTotal),
    total: Number(invoice.total),
    paidAmount: Number(invoice.paidAmount),
    remaining: Number(invoice.total.sub(invoice.paidAmount)),
    items: invoice.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      unitCost: Number(item.unitCost),
      taxRate: Number(item.taxRate),
      discount: Number(item.discount),
      lineTotal: Number(item.lineTotal),
      product: { ...item.product, purchasePrice: Number(item.product.purchasePrice), salePrice: Number(item.product.salePrice), taxRate: Number(item.product.taxRate), currentQuantity: Number(item.product.currentQuantity), minimumStock: Number(item.product.minimumStock) },
    })),
    paymentAllocations: invoice.paymentAllocations.map((allocation) => ({ ...allocation, amount: Number(allocation.amount), payment: { ...allocation.payment, amount: Number(allocation.payment.amount) } })),
    company: settings,
  });
}

async function handlePATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, actorId, isPlatformAdmin } = auth;
  const body = await request.json();
  if (body.status !== InvoiceStatus.VOID) return NextResponse.json({ error: "Only voiding is supported after posting" }, { status: 400 });

  const existing = await prisma.invoice.findUnique({ where: { id: params.id }, select: { userId: true } });
  try {
    verifyOwnership(existing, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const current = await tx.invoice.findUniqueOrThrow({ where: { id: params.id }, include: { items: true } });
      if (current.status === InvoiceStatus.VOID) throw new Error("Invoice already void");
      if (current.paidAmount.gt(0)) throw new Error("Reverse allocated payments before voiding");
      if (current.affectsStock) {
        for (const item of current.items) {
          const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
          const after = product.currentQuantity.add(item.quantity);
          await tx.product.update({ where: { id: item.productId }, data: { currentQuantity: after } });
          await tx.stockMovement.create({ data: { productId: item.productId, type: "RETURN_IN", quantity: item.quantity, quantityBefore: product.currentQuantity, quantityAfter: after, invoiceId: current.id, reference: current.number, note: "Invoice void reversal", createdById: actorId, userId: current.userId } });
        }
      }
      await tx.contact.update({ where: { id: current.contactId }, data: { currentBalance: { decrement: current.total } } });
      const updated = await tx.invoice.update({ where: { id: current.id }, data: { status: InvoiceStatus.VOID } });
      await tx.activityLog.create({ data: { userId, action: ActivityAction.UPDATE, entityType: "Invoice", entityId: current.id, description: `Voided invoice ${current.number}` } });
      return updated;
    });
    return NextResponse.json(invoice);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Void failed" }, { status: 400 });
  }
}

export const GET = secureRoute("sales.read", handleGET);

export const PATCH = secureRoute("finance.amend", handlePATCH);
