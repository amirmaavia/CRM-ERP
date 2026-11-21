import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getApiSession } from "@/lib/http/api";

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const page = Number(new URL(request.url).searchParams.get("page") || 1);
  if (!Number.isSafeInteger(page) || page < 1) return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  const where = { userId: session.user.id };
  const [items, total] = await prisma.$transaction([
    prisma.activityLog.findMany({ where, select: { id: true, action: true, entityType: true, description: true, createdAt: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 20 }),
    prisma.activityLog.count({ where }),
  ]);
  return NextResponse.json({ items, pagination: { page, pages: Math.ceil(total / 20) } });
}
