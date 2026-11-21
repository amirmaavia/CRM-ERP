import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  const message = "If an active account exists, password reset instructions will be sent to its email address.";
  try {
    await createSupabaseServerClient().auth.resetPasswordForEmail(parsed.data.email.toLowerCase(), {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin}/reset-password`,
    });
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Password recovery is temporarily unavailable" }, { status: 503 });
  }
}
