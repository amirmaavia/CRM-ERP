import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, requirePlatformAdmin } from "@/lib/http/api";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  try {
    const [totalUsers, activeUsers, inactiveUsers, recentSignups, totalRevenue] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: { in: ["INACTIVE", "SUSPENDED"] } } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
      prisma.invoice.aggregate({ where: { status: { notIn: ["DRAFT", "VOID"] } }, _sum: { total: true } }),
    ]);

    return NextResponse.json({ totalUsers, activeUsers, inactiveUsers, recentSignups, totalRevenue: Number(totalRevenue._sum.total ?? 0) });
  } catch (error) {
    return apiError(error);
  }
}