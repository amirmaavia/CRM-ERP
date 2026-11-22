import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) throw new Error("Public Supabase configuration is missing");
  // A browser must never send elevated credentials, even if misconfigured.
  let allowed = key.startsWith("sb_publishable_");
  if (!allowed && key.split(".").length === 3) {
    try {
      const payload = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      allowed = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="))).role === "anon";
    } catch { allowed = false; }
  }
  if (!allowed) throw new Error("Browser Supabase requires a publishable or anon key; secret keys are forbidden");
  return createBrowserClient(
    url,
    key,
  );
}
