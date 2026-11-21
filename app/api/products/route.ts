import { secureRoute } from "@/lib/http/secure-route";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext } from "@/lib/http/api";
import { productSchema } from "@/lib/validations/inventory";

async function handleGET(request: Request) {
  const auth = await getTenantContext();
  const { userId } = auth;
  const u = new URL(request.url);
  const page = Math.max(Number(u.searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(Number(u.searchParams.get("pageSize")) || 20, 100);
  const search = u.searchParams.get("search")?.trim();
  const stock = u.searchParams.get("stock");

  const where: Prisma.ProductWhereInput = {
    userId,
    ...(search ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } : {}),
    ...(stock === "active" ? { active: true } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include: { category: true }, orderBy: { name: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.product.count({ where }),
  ]);

  const mapped = items.map((x) => ({
    ...x,
    purchasePrice: Number(x.purchasePrice),
    salePrice: Number(x.salePrice),
    taxRate: Number(x.taxRate),
    currentQuantity: Number(x.currentQuantity),
    minimumStock: Number(x.minimumStock),
    lowStock: x.currentQuantity.lte(x.minimumStock),
  }));

  return NextResponse.json({ items: mapped, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
}

async function handlePOST(request: Request) {
  const auth = await getTenantContext();
  const { userId } = auth;
  const parsed = productSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid product details" }, { status: 400 });

  try {
    const x = parsed.data;
    const product = await prisma.product.create({
      data: { ...x, categoryId: x.categoryId || null, purchasePrice: new Prisma.Decimal(x.purchasePrice), salePrice: new Prisma.Decimal(x.salePrice), taxRate: new Prisma.Decimal(x.taxRate), minimumStock: new Prisma.Decimal(x.minimumStock), userId },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    return apiError(e);
  }
}
export const GET = secureRoute("inventory.read", handleGET);

export const POST = secureRoute("inventory.write", handlePOST);
