import { secureRoute } from "@/lib/http/secure-route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext, verifyOwnership } from "@/lib/http/api";
import { taskUpdateSchema } from "@/lib/validations/work";

async function handlePATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;
  const parsed = taskUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid task details" }, { status: 400 });

  const task = await prisma.task.findUnique({ where: { id: params.id }, select: { userId: true } });
  try {
    verifyOwnership(task, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const x = parsed.data;
    const updated = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...x,
        dueAt: x.dueAt ? new Date(x.dueAt) : x.dueAt === null ? null : undefined,
        reminderAt: x.reminderAt ? new Date(x.reminderAt) : x.reminderAt === null ? null : undefined,
        assignedToId: x.assignedToId || undefined,
        dealId: x.dealId || undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return apiError(e);
  }
}

async function handleDELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, isPlatformAdmin } = auth;

  const task = await prisma.task.findUnique({ where: { id: params.id }, select: { userId: true } });
  try {
    verifyOwnership(task, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.task.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Task deleted" });
  } catch (e) {
    return apiError(e);
  }
}
export const PATCH = secureRoute("crm.write", handlePATCH);

export const DELETE = secureRoute("crm.write", handleDELETE);
