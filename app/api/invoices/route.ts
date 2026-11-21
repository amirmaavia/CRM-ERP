import { secureRoute } from "@/lib/http/secure-route";
import { ActivityAction, InvoiceStatus, Prisma, RoleName } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext } from "@/lib/http/api";
import { invoiceSchema } from "@/lib/validations/finance";

async function handleGET(request: Request) {
  const auth = await getTenantContext();
  const { userId, actorId } = auth;
  const url = new URL(request.url);
  const contactId = url.searchParams.get("contactId");
  const outstanding = url.searchParams.get("outstanding");

  const items = await prisma.invoice.findMany({
    where: { userId, ...(contactId ? { contactId } : {}), ...(outstanding === "true" ? { status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] } } : {}) },
    include: { contact: { select: { id: true, firstName: true, lastName: true } }, items: { include: { product: { select: { name: true, sku: true } } } } },
    orderBy: { issueDate: "desc" },
    take: 200,
  });
  return NextResponse.json(
    items.map((invoice) => ({
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
      })),
    })),
  );
}

async function handlePOST(request: Request) {
  const auth = await getTenantContext();
  const { userId, actorId, isPlatformAdmin } = auth;
  const parsed = invoiceSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid invoice details", fields: parsed.error.flatten().fieldErrors }, { status: 400 });

  const input = parsed.data;
  const canOverrideStock = isPlatformAdmin;
  if (input.stockOverride && !canOverrideStock) return NextResponse.json({ error: "Only Admin can override stock" }, { status: 403 });
  if (!input.affectsStock && !canOverrideStock) return NextResponse.json({ error: "Only Admin can enter historical sales" }, { status: 403 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const productIds = Array.from(new Set(input.items.map((item) => item.productId)));
      const products = await tx.product.findMany({ where: { id: { in: productIds }, active: true, userId } });
      if (products.length !== productIds.length) throw new Error("One or more products are unavailable");

      const lines = input.items.map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId)!;
        const quantity = new Prisma.Decimal(item.quantity);
        if (input.affectsStock && product.currentQuantity.lt(quantity) && !input.stockOverride) throw new Error(`Insufficient stock for ${product.name}. Available: ${product.currentQuantity}`);
        const price = item.unitPrice === undefined ? product.salePrice : new Prisma.Decimal(item.unitPrice);
        const tax = item.taxRate === undefined ? product.taxRate : new Prisma.Decimal(item.taxRate);
        const lineDiscount = new Prisma.Decimal(item.discount);
        const base = quantity.mul(price).sub(lineDiscount);
        const lineTotal = base.add(base.mul(tax).div(100));
        return { product, quantity, price, tax, lineDiscount, lineTotal };
      });

      const subtotal = lines.reduce((sum, line) => sum.add(line.quantity.mul(line.price)), new Prisma.Decimal(0));
      const itemDiscount = lines.reduce((sum, line) => sum.add(line.lineDiscount), new Prisma.Decimal(0));
      const taxTotal = lines.reduce((sum, line) => sum.add(line.lineTotal.sub(line.quantity.mul(line.price).sub(line.lineDiscount))), new Prisma.Decimal(0));
      const discountTotal = new Prisma.Decimal(input.discountTotal).add(itemDiscount);
      const total = subtotal.add(taxTotal).sub(discountTotal);
      if (total.lt(0)) throw new Error("Discount exceeds invoice value");

      const cashSale = input.type === "CASH_SALE";
      const invoice = await tx.invoice.create({
        data: {
          number: `INV-${Date.now()}`,
          contactId: input.contactId,
          type: input.type,
          status: cashSale ? InvoiceStatus.PAID : InvoiceStatus.UNPAID,
          issueDate: input.issueDate ? new Date(input.issueDate) : new Date(),
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          subtotal,
          taxTotal,
          discountTotal,
          total,
          paidAmount: cashSale ? total : new Prisma.Decimal(0),
          notes: input.notes,
          stockOverride: input.stockOverride,
          affectsStock: input.affectsStock,
          createdById: actorId,
          userId,
          items: { create: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity, unitPrice: line.price, unitCost: line.product.purchasePrice, taxRate: line.tax, discount: line.lineDiscount, lineTotal: line.lineTotal })) },
        },
      });

      if (input.affectsStock) {
        for (const line of lines) {
          const before = line.product.currentQuantity;
          const after = before.sub(line.quantity);
          await tx.product.update({ where: { id: line.product.id }, data: { currentQuantity: after } });
          await tx.stockMovement.create({
            data: { productId: line.product.id, type: "OUT", quantity: line.quantity.neg(), quantityBefore: before, quantityAfter: after, invoiceId: invoice.id, reference: invoice.number, note: "Invoice sale", createdById: actorId, userId },
          });
        }
      }

      await tx.contact.update({ where: { id: input.contactId }, data: { currentBalance: { increment: total } } });

      if (cashSale) {
        await tx.payment.create({
          data: { number: `PAY-CASH-${Date.now()}`, partyType: "CUSTOMER", direction: "IN", method: "CASH", amount: total, paymentDate: invoice.issueDate, contactId: input.contactId, createdById: actorId, userId, notes: `Automatic cash receipt for ${invoice.number}`, allocations: { create: { invoiceId: invoice.id, amount: total } } },
        });
        await tx.contact.update({ where: { id: input.contactId }, data: { currentBalance: { decrement: total } } });
      }

      await tx.activityLog.create({ data: { userId, action: ActivityAction.CREATE, entityType: "Invoice", entityId: invoice.id, description: `Created invoice ${invoice.number}`, newValues: { total: total.toString(), stockOverride: input.stockOverride } } });
      return invoice;
    });
    return NextResponse.json({ ...result, subtotal: Number(result.subtotal), taxTotal: Number(result.taxTotal), discountTotal: Number(result.discountTotal), total: Number(result.total), paidAmount: Number(result.paidAmount) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invoice creation failed" }, { status: 400 });
  }
}

export const GET = secureRoute("sales.read", handleGET);

export const POST = secureRoute("sales.write", handlePOST);
