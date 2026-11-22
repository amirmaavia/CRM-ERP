import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const unavailable = (code: string) => new NextResponse(`Authentication is temporarily unavailable. Please try again later.\nReference: ${code}`, {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "30", "X-Auth-Diagnostic": code, "Content-Type": "text/plain; charset=utf-8" },
  });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseKey) {
    const code = !supabaseUrl ? "AUTH_CONFIG_URL_MISSING" : "AUTH_CONFIG_KEY_MISSING";
    console.error("[auth-middleware]", code);
    return unavailable(code);
  }
  try {
    if (!supabaseUrl || !supabaseKey || !["https:", "http:"].includes(new URL(supabaseUrl).protocol)) {
      throw new Error("Invalid Supabase configuration");
    }
  } catch {
    // Log variable names only: never log keys, cookies, or session tokens.
    console.error("[auth-middleware] Missing or invalid NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return unavailable("AUTH_CONFIG_URL_INVALID");
  }
  try {
    let response = NextResponse.next({ request });
    const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    } });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && error.name !== "AuthSessionMissingError" && (!error.status || error.status >= 500 || error.status === 429)) {
      console.error("[auth-middleware] Authentication service unavailable", { name: error.name, status: error.status });
      return unavailable("AUTH_SERVICE_UNAVAILABLE");
    }
    if (!user) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.searchParams.set("callbackUrl", request.nextUrl.pathname);
      const redirect = NextResponse.redirect(login);
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      redirect.headers.set("Cache-Control", "no-store");
      return redirect;
    }
    return response;
  } catch {
    console.error("[auth-middleware] Unexpected authentication failure; request denied");
    return unavailable("AUTH_UNEXPECTED_FAILURE");
  }
}

export const config = { matcher: ["/dashboard/:path*", "/management/:path*", "/admin/:path*"] };
