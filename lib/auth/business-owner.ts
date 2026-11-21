import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/http/api";
import { prisma } from "@/lib/db/prisma";

export async function requireBusinessOwner() {
  const session = await getApiSession();
  if (!session?.user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const owner = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, accountOwnerId: true, status: true } });
  if (!owner || owner.status !== "ACTIVE" || (owner.accountOwnerId !== null && !session.user.permissions.includes("business.users.manage"))) return { error: NextResponse.json({ error: "Business owner access required" }, { status: 403 }) };
  return { session, owner: { ...owner, id: owner.accountOwnerId ?? owner.id } };
}

export async function getStaffRoles(permissions: string[]) {
  const roles = await prisma.role.findMany({ where: { name: { in: ["USER", "SALES", "ACCOUNTANT", "INVENTORY"] } }, include: { permissions: { include: { permission: true } } } });
  return roles.filter(role => role.permissions.every(({ permission }) => permissions.includes(permission.key)));
}
