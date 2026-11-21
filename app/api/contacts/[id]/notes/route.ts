import { secureRoute } from "@/lib/http/secure-route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiError, getTenantContext, verifyOwnership } from "@/lib/http/api";
import { noteSchema } from "@/lib/validations/crm";

async function handlePOST(request: Request, { params }: { params: { id: string } }) {
  const auth = await getTenantContext();
  const { userId, actorId, isPlatformAdmin } = auth;

  const contact = await prisma.contact.findUnique({ where: { id: params.id }, select: { userId: true } });
  try {
    verifyOwnership(contact, userId, isPlatformAdmin);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = noteSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Note cannot be empty" }, { status: 400 });

  const note = await prisma.note.create({
    data: { contactId: params.id, authorId: actorId, content: parsed.data.content, userId },
    include: { author: { select: { name: true } } },
  });
  return NextResponse.json(note, { status: 201 });
}

export const POST = secureRoute("crm.write", handlePOST);
