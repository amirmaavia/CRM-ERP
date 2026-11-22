import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { middleware } from "../middleware";

test("middleware denies access cleanly for invalid configuration and redirects signed-out users", async () => {
  const names = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
  const previous = names.map((name) => process.env[name]);
  try {
    names.forEach((name) => delete process.env[name]);
    const request = () => new NextRequest("https://erp.test/dashboard");
    const missing = await middleware(request());
    assert.equal(missing.status, 503);
    assert.equal(missing.headers.get("cache-control"), "no-store");
    process.env.NEXT_PUBLIC_SUPABASE_URL = "invalid-url";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-public-key";
    assert.equal((await middleware(request())).status, 503);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    // No cookies means no auth session; no network request is needed.
    const signedOut = await middleware(request());
    assert.equal(signedOut.status, 307);
    const login = new URL(signedOut.headers.get("location")!);
    assert.equal(login.pathname, "/login");
    assert.equal(login.searchParams.get("callbackUrl"), "/dashboard");
    // An empty publishable key must still allow the legacy anon-key fallback.
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    assert.equal((await middleware(request())).status, 307);
  } finally {
    names.forEach((name, i) => { if (previous[i] === undefined) delete process.env[name]; else process.env[name] = previous[i]; });
  }
});
