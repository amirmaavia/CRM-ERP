import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ password: z.string().min(8).max(128) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid password" }, { status: 400 });
  const { error } = await createSupabaseServerClient().auth.updateUser({ password: parsed.data.password });
  if (error) return NextResponse.json({ error: "This reset session is invalid or expired" }, { status: 400 });
  return NextResponse.json({ message: "Password updated successfully" });
}
