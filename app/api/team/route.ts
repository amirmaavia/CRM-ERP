import { secureRoute } from "@/lib/http/secure-route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/http/api";

async function handleGET() {
  const auth = await getTenantContext();
  const { userId } = auth;
  {
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE", OR: [{ id: userId }, { accountOwnerId: userId }] },
      select: { id: true, name: true, email: true, role: { select: { name: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  }
}

export const GET = secureRoute("", handleGET);
