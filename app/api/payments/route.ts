import { secureRoute } from "@/lib/http/secure-route";
import { ActivityAction, InvoiceStatus, PaymentDirection, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext } from "@/lib/http/api";
import { paymentSchema } from "@/lib/validations/finance";

async function handleGET() {
  const auth = await getTenantContext();
  const { userId, actorId } = auth;
  const items = await prisma.payment.findMany({
    where: { userId },
    include: { contact: { select: { firstName: true, lastName: true } }, supplier: { select: { name: true } }, allocations: true, createdBy: { select: { name: true } } },
    orderBy: { paymentDate: "desc" },
    take: 200,
  });
  return NextResponse.json(
    items.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
      allocations: payment.allocations.map((allocation) => ({ ...allocation, amount: Number(allocation.amount) })),
    })),
  );
}

async function handlePOST(request: Request) {
  const auth = await getTenantContext();
  const { userId, actorId } = auth;
  const parsed = paymentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });

  const input = parsed.data;
  const totalAllocated = input.allocations.reduce((s, x) => s + x.amount, 0);
  if (Math.abs(totalAllocated - input.amount) > 0.005) return NextResponse.json({ error: "Allocation total must equal payment amount" }, { status: 400 });
  if (input.partyType === "CUSTOMER" && !input.contactId || input.partyType === "SUPPLIER" && !input.supplierId) return NextResponse.json({ error: "Select the payment party" }, { status: 400 });

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          number: `PAY-${Date.now()}`,
          partyType: input.partyType,
          direction: input.partyType === "CUSTOMER" ? PaymentDirection.IN : PaymentDirection.OUT,
          method: input.method,
          amount: new Prisma.Decimal(input.amount),
          reference: input.reference,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
          contactId: input.contactId || null,
          supplierId: input.supplierId || null,
          notes: input.notes,
          createdById: actorId,
          userId,
        },
      });

      for (const allocation of input.allocations) {
        const amount = new Prisma.Decimal(allocation.amount);
        if (input.partyType === "CUSTOMER") {
          if (!allocation.invoiceId) throw new Error("Invoice allocation required");
          const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: allocation.invoiceId, userId } });
          if (invoice.contactId !== input.contactId) throw new Error("Invoice belongs to another customer");
          const remaining = invoice.total.sub(invoice.paidAmount);
          if (amount.gt(remaining)) throw new Error(`Allocation exceeds ${invoice.number} balance`);
          const paid = invoice.paidAmount.add(amount);
          await tx.invoice.update({ where: { id: invoice.id }, data: { paidAmount: paid, status: paid.gte(invoice.total) ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID } });
          await tx.paymentAllocation.create({ data: { paymentId: created.id, invoiceId: invoice.id, amount } });
        } else {
          if (!allocation.purchaseOrderId) throw new Error("Purchase order allocation required");
          const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: allocation.purchaseOrderId, userId } });
          if (po.supplierId !== input.supplierId) throw new Error("Purchase order belongs to another supplier");
          const paidAmount = po.paidAmount.add(amount);
          await tx.purchaseOrder.update({ where: { id: po.id }, data: { paidAmount, status: paidAmount.gte(po.total) ? "RECEIVED" : "PARTIALLY_RECEIVED" } });
          await tx.paymentAllocation.create({ data: { paymentId: created.id, purchaseOrderId: po.id, amount } });
        }
      }

      if (input.partyType === "CUSTOMER") {
        await tx.contact.update({ where: { id: input.contactId!, userId }, data: { currentBalance: { decrement: new Prisma.Decimal(input.amount) } } });
      } else {
        await tx.supplier.update({ where: { id: input.supplierId!, userId }, data: { currentBalance: { decrement: new Prisma.Decimal(input.amount) } } });
      }

      await tx.activityLog.create({ data: { userId, action: ActivityAction.PAYMENT, entityType: "Payment", entityId: created.id, description: `Recorded payment ${created.number}` } });
      return created;
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export const GET = secureRoute("payments.read", handleGET);

export const POST = secureRoute("payments.write", handlePOST);
