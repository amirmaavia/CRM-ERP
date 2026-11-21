import { secureRoute } from "@/lib/http/secure-route";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext, verifyOwnership } from "@/lib/http/api";
import { productUpdateSchema } from "@/lib/validations/inventory";

async function handleGET(_: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;

  const x = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true, stockMovements: { include: { warehouse: true, createdBy: { select: { name: true } } }, orderBy: { occurredAt: "desc" }, take: 100 } },
  });

  try {
    verifyOwnership(x, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ...x,
    purchasePrice: Number(x.purchasePrice),
    salePrice: Number(x.salePrice),
    taxRate: Number(x.taxRate),
    currentQuantity: Number(x.currentQuantity),
    minimumStock: Number(x.minimumStock),
    stockMovements: x.stockMovements.map((m) => ({ ...m, quantity: Number(m.quantity), quantityBefore: Number(m.quantityBefore), quantityAfter: Number(m.quantityAfter) })),
  });
}

async function handlePATCH(r: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;
  const parsed = productUpdateSchema.safeParse(await r.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid product details" }, { status: 400 });

  const existing = await prisma.product.findUnique({ where: { id: params.id }, select: { userId: true } });
  try {
    verifyOwnership(existing, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const x = parsed.data;
    return NextResponse.json(
      await prisma.product.update({
        where: { id: params.id },
        data: {
          ...x,
          categoryId: x.categoryId || undefined,
          purchasePrice: x.purchasePrice === undefined ? undefined : new Prisma.Decimal(x.purchasePrice),
          salePrice: x.salePrice === undefined ? undefined : new Prisma.Decimal(x.salePrice),
          taxRate: x.taxRate === undefined ? undefined : new Prisma.Decimal(x.taxRate),
          minimumStock: x.minimumStock === undefined ? undefined : new Prisma.Decimal(x.minimumStock),
        },
      }),
    );
  } catch (e) {
    return apiError(e);
  }
}
export const GET = secureRoute("inventory.read", handleGET);

export const PATCH = secureRoute("inventory.write", handlePATCH);
