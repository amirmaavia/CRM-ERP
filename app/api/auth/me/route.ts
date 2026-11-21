import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getTenantContext } from "@/lib/http/api";
import { updateProfileSchema } from "@/lib/validations/auth";
import { ActivityAction } from "@prisma/client";

export async function GET() {
  try {
    const { actorId: userId, role, isPlatformAdmin, permissions } = await getTenantContext();

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        status: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
        notificationPreference: true,
        companySettings: { select: { companyName: true, currency: true, timezone: true, watermarkText: true } },
      },
    });

    return NextResponse.json({ user, role, isPlatformAdmin, permissions });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("Get profile error:", error);
    return NextResponse.json({ error: "Failed to get profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { actorId: userId } = await getTenantContext();
    const parsed = updateProfileSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid profile details", fields: parsed.error.flatten().fieldErrors }, { status: 400 });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name: parsed.data.name, image: parsed.data.image },
      select: { id: true, name: true, email: true, image: true, status: true, role: { select: { name: true } } },
    });

    await prisma.activityLog.create({
      data: { userId, action: ActivityAction.UPDATE, entityType: "User", entityId: userId, description: "Profile updated" },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}