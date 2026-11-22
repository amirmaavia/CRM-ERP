import { createBrowserClient } from "@supabase/ssr";

export class AuthConfigurationError extends Error {}

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) throw new AuthConfigurationError("Login is not configured for this deployment. Reference: AUTH_PUBLIC_CONFIG_MISSING");
  try {
    if (!["https:", "http:"].includes(new URL(url).protocol)) throw new Error();
  } catch {
    throw new AuthConfigurationError("Login configuration is invalid. Reference: AUTH_PUBLIC_URL_INVALID");
  }
  // A browser must never send elevated credentials, even if misconfigured.
  let allowed = key.startsWith("sb_publishable_");
  if (!allowed && key.split(".").length === 3) {
    try {
      const payload = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      allowed = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="))).role === "anon";
    } catch { allowed = false; }
  }
  if (!allowed) throw new AuthConfigurationError("Login configuration requires a public API key. Reference: AUTH_PUBLIC_KEY_INVALID");
  return createBrowserClient(
    url,
    key,
  );
}
