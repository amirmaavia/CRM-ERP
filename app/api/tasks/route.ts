import { secureRoute } from "@/lib/http/secure-route";
import { Prisma, TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext } from "@/lib/http/api";
import { taskSchema } from "@/lib/validations/work";

async function handleGET(request: Request) {
  const auth = await getTenantContext();
  const { userId, actorId } = auth;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as TaskStatus | null;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: Prisma.TaskWhereInput = {
    userId,
    ...(status && Object.values(TaskStatus).includes(status) ? { status } : {}),
    ...(from || to ? { dueAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
  };

  const items = await prisma.task.findMany({
    where,
    include: { assignedTo: { select: { id: true, name: true } }, deal: { select: { id: true, title: true } } },
    orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
  });
  return NextResponse.json(items);
}

async function handlePOST(request: Request) {
  const auth = await getTenantContext();
  const { userId, actorId } = auth;
  const parsed = taskSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid task details" }, { status: 400 });

  try {
    const x = parsed.data;
    const task = await prisma.task.create({
      data: { ...x, assignedToId: x.assignedToId || actorId, dealId: x.dealId || null, dueAt: x.dueAt ? new Date(x.dueAt) : null, reminderAt: x.reminderAt ? new Date(x.reminderAt) : null, createdById: actorId, userId },
      include: { assignedTo: { select: { id: true, name: true } }, deal: { select: { id: true, title: true } } },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}

export const GET = secureRoute("crm.read", handleGET);

export const POST = secureRoute("crm.write", handlePOST);
