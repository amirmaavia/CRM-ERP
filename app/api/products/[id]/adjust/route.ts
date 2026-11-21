import { secureRoute } from "@/lib/http/secure-route";
import { ActivityAction, Prisma, StockMovementType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext, verifyOwnership } from "@/lib/http/api";
import { adjustmentSchema } from "@/lib/validations/inventory";

async function handlePOST(r: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, actorId, isPlatformAdmin } = auth;
  const parsed = adjustmentSchema.safeParse(await r.json());
  if (!parsed.success) return NextResponse.json({ error: "Quantity and reason are required" }, { status: 400 });

  const existing = await prisma.product.findUnique({ where: { id: params.id }, select: { userId: true } });
  try {
    verifyOwnership(existing, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUniqueOrThrow({ where: { id: params.id } });
      const before = product.currentQuantity;
      const delta = new Prisma.Decimal(parsed.data.quantity);
      const after = before.add(delta);
      const updated = await tx.product.update({ where: { id: params.id }, data: { currentQuantity: after } });
      await tx.stockMovement.create({
        data: { productId: params.id, warehouseId: parsed.data.warehouseId || null, type: StockMovementType.ADJUSTMENT, quantity: delta, quantityBefore: before, quantityAfter: after, note: parsed.data.note, createdById: actorId, userId },
      });
      await tx.activityLog.create({ data: { userId, action: ActivityAction.UPDATE, entityType: "Product", entityId: params.id, description: `Stock adjustment ${delta.toString()}: ${parsed.data.note}` } });
      return updated;
    });
    return NextResponse.json({ ...result, currentQuantity: Number(result.currentQuantity) });
  } catch {
    return NextResponse.json({ error: "Stock adjustment failed" }, { status: 500 });
  }
}

export const POST = secureRoute("inventory.write", handlePOST);
