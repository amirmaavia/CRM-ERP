import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/supabase-session";
import { isPlatformAdmin, isAdmin } from "@/lib/auth/permissions";
import { ActivityAction } from "@prisma/client";

export async function getApiSession() {
  return getAppSession();
}

export async function requireApiAdmin() {
  const session = await getApiSession();
  if (!session?.user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  if (!isAdmin(session.user.role)) return { error: NextResponse.json({ error: "Administrator access required" }, { status: 403 }) };
  return { session };
}

export async function requirePlatformAdmin() {
  const session = await getApiSession();
  if (!session?.user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  if (!isPlatformAdmin(session.user.role)) return { error: NextResponse.json({ error: "Platform administrator access required" }, { status: 403 }) };
  return { session };
}

export async function requireApiPermission(permission?: string) {
  const session = await getApiSession();
  if (!session?.user) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  if (permission && !session.user.permissions.includes(permission)) return { error: NextResponse.json({ error: "Permission denied" }, { status: 403 }) };
  return { session };
}

// Get tenant context (userId for data isolation)
export async function getTenantContext() {
  const session = await getApiSession();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return {
    userId: session.user.tenantId ?? session.user.id,
    actorId: session.user.id,
    role: session.user.role,
    isPlatformAdmin: isPlatformAdmin(session.user.role),
    permissions: session.user.permissions ?? [],
  };
}

// Verify resource ownership
export function verifyOwnership<T extends { userId: string | null | undefined }>(
  entity: T | null,
  userId: string,
  _isPlatformAdmin: boolean
): asserts entity is NonNullable<T> {
  if (!entity) {
    throw new Error("NOT_FOUND");
  }
  if (entity.userId !== userId) {
    throw new Error("FORBIDDEN");
  }
}

export function apiError(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
}

export { ActivityAction };
