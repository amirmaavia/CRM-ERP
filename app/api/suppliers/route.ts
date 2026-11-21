import { secureRoute } from "@/lib/http/secure-route";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext } from "@/lib/http/api";
import { supplierSchema } from "@/lib/validations/inventory";

async function handleGET(r: Request) {
  const auth = await getTenantContext();
  const { userId } = auth;
  const search = new URL(r.url).searchParams.get("search")?.trim();
  const items = await prisma.supplier.findMany({
    where: { userId, ...(search ? { name: { contains: search } } : {}) },
    include: { _count: { select: { purchaseOrders: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items.map((x) => ({ ...x, openingBalance: Number(x.openingBalance), currentBalance: Number(x.currentBalance) })));
}

async function handlePOST(r: Request) {
  const auth = await getTenantContext();
  const { userId } = auth;
  const parsed = supplierSchema.safeParse(await r.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid supplier details" }, { status: 400 });

  try {
    const x = parsed.data;
    const amount = new Prisma.Decimal(x.openingBalance);
    return NextResponse.json(
      await prisma.supplier.create({
        data: { ...x, email: x.email || null, openingBalance: amount, currentBalance: amount, userId },
      }),
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
export const GET = secureRoute("vendors.read", handleGET);

export const POST = secureRoute("vendors.write", handlePOST);
