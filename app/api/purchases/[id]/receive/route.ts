import { secureRoute } from "@/lib/http/secure-route";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext, verifyOwnership } from "@/lib/http/api";

async function handlePOST(request: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, actorId, isPlatformAdmin } = auth;
  const body = await request.json().catch(() => ({}));

  const existing = await prisma.purchaseOrder.findUnique({ where: { id: params.id }, select: { userId: true } });
  try {
    verifyOwnership(existing, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: params.id }, include: { items: true } });
      if (["RECEIVED", "CANCELLED"].includes(purchase.status)) throw new Error("Purchase cannot be received");

      let receivedValue = new Prisma.Decimal(0);
      for (const item of purchase.items) {
        const requested = body.items?.find((entry: { itemId: string }) => entry.itemId === item.id)?.quantity;
        const remaining = item.quantity.sub(item.receivedQuantity);
        const quantity = requested === undefined ? remaining : new Prisma.Decimal(requested);
        if (quantity.lte(0) || quantity.gt(remaining)) continue;

        const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
        const after = product.currentQuantity.add(quantity);
        await tx.product.update({ where: { id: item.productId }, data: { currentQuantity: after } });
        await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQuantity: { increment: quantity } } });
        await tx.stockMovement.create({
          data: { productId: item.productId, type: "IN", quantity, quantityBefore: product.currentQuantity, quantityAfter: after, purchaseOrderId: purchase.id, reference: purchase.number, note: "Purchase receipt", createdById: actorId, userId },
        });
        receivedValue = receivedValue.add(quantity.mul(item.unitPrice).mul(new Prisma.Decimal(1).add(item.taxRate.div(100))));
      }

      const refreshed = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: purchase.id } });
      const fullyReceived = refreshed.every((item) => item.receivedQuantity.gte(item.quantity));
      await tx.purchaseOrder.update({ where: { id: purchase.id }, data: { status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED", paidAmount: purchase.type === "CASH_PURCHASE" ? { increment: receivedValue } : undefined } });
      await tx.supplier.update({ where: { id: purchase.supplierId }, data: { currentBalance: { increment: receivedValue } } });

      if (purchase.type === "CASH_PURCHASE" && receivedValue.gt(0)) {
        await tx.payment.create({
          data: { number: `PAY-CASH-PO-${Date.now()}`, partyType: "SUPPLIER", direction: "OUT", method: "CASH", amount: receivedValue, paymentDate: new Date(), supplierId: purchase.supplierId, createdById: actorId, userId, notes: `Automatic cash payment for ${purchase.number}`, allocations: { create: { purchaseOrderId: purchase.id, amount: receivedValue } } },
        });
        await tx.supplier.update({ where: { id: purchase.supplierId }, data: { currentBalance: { decrement: receivedValue } } });
      }

      return { status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED", receivedValue: Number(receivedValue), cashPaid: purchase.type === "CASH_PURCHASE" ? Number(receivedValue) : 0 };
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Receipt failed" }, { status: 400 });
  }
}

export const POST = secureRoute("vendors.write", handlePOST);
