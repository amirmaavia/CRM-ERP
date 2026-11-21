import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { changePasswordSchema } from "@/lib/validations/auth";
import { getTenantContext, ActivityAction } from "@/lib/http/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { actorId: userId } = await getTenantContext();
    const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid password details", fields: parsed.error.flatten().fieldErrors }, { status: 400 });

    const { currentPassword, newPassword } = parsed.data;

    const supabase = createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.email || (await supabase.auth.signInWithPassword({ email: authUser.email, password: currentPassword })).error) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
    await prisma.activityLog.create({
        data: { userId, action: ActivityAction.PASSWORD_CHANGE, entityType: "User", entityId: userId, description: "Password changed" },
      });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
