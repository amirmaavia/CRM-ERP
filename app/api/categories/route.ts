import { secureRoute } from "@/lib/http/secure-route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/http/api";

async function handleGET() {
  const auth = await getTenantContext();
  const { userId } = auth;
  return NextResponse.json(await prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" } }));
}

async function handlePOST(r: Request) {
  const auth = await getTenantContext();
  const { userId } = auth;
  const b = await r.json();
  if (!b.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  return NextResponse.json(await prisma.category.create({ data: { name: b.name.trim(), userId } }), { status: 201 });
}
export const GET = secureRoute("inventory.read", handleGET);

export const POST = secureRoute("inventory.write", handlePOST);
