import { secureRoute } from "@/lib/http/secure-route";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext } from "@/lib/http/api";
import { purchaseSchema } from "@/lib/validations/inventory";

async function handleGET() {
  const auth = await getTenantContext();
  const { userId } = auth;
  const items = await prisma.purchaseOrder.findMany({
    where: { userId },
    include: { supplier: { select: { id: true, name: true, companyId: true } }, paymentAllocations: { select: { amount: true } }, items: { include: { product: { select: { name: true, sku: true } } } } },
    orderBy: { orderDate: "desc" },
    take: 100,
  });
  return NextResponse.json(
    items.map((order) => {
      const paidAmount = order.paymentAllocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
      return {
        ...order,
        paymentAllocations: undefined,
        subtotal: Number(order.subtotal),
        taxTotal: Number(order.taxTotal),
        total: Number(order.total),
        paidAmount,
        remaining: Number(order.total) - paidAmount,
        items: order.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          receivedQuantity: Number(item.receivedQuantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          lineTotal: Number(item.lineTotal),
        })),
      };
    }),
  );
}

async function handlePOST(request: Request) {
  const auth = await getTenantContext();
  const { userId } = auth;
  const parsed = purchaseSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid purchase order" }, { status: 400 });

  try {
    const input = parsed.data;
    const rows = input.items.map((item) => {
      const base = item.quantity * item.unitPrice;
      return { ...item, lineTotal: base + base * item.taxRate / 100 };
    });
    const subtotal = rows.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const total = rows.reduce((sum, item) => sum + item.lineTotal, 0);
    const order = await prisma.purchaseOrder.create({
      data: {
        number: `PO-${Date.now()}`,
        supplierId: input.supplierId,
        type: input.type,
        status: "ORDERED",
        orderDate: input.orderDate ? new Date(input.orderDate) : new Date(),
        expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
        notes: input.notes,
        subtotal: new Prisma.Decimal(subtotal),
        taxTotal: new Prisma.Decimal(total - subtotal),
        total: new Prisma.Decimal(total),
        userId,
        items: { create: rows.map((item) => ({ productId: item.productId, quantity: new Prisma.Decimal(item.quantity), unitPrice: new Prisma.Decimal(item.unitPrice), taxRate: new Prisma.Decimal(item.taxRate), lineTotal: new Prisma.Decimal(item.lineTotal) })) },
      },
      include: { items: true, supplier: true },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
export const GET = secureRoute("vendors.read", handleGET);

export const POST = secureRoute("vendors.write", handlePOST);
