import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/permissions";
import { getAppSession } from "@/lib/auth/supabase-session";

export async function requireSession() {
  const session = await getAppSession();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (!isAdmin(session.user.role)) redirect("/unauthorized");
  return session;
}
