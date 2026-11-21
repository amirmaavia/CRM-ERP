"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("supabase-recovery");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const code = searchParams.get("code");
    if (code) void supabase.auth.exchangeCodeForSession(code).then(({ error }) => { if (error) setError("This reset link is invalid or expired"); });
    setToken(searchParams.get("token") || "supabase-recovery");
  }, [searchParams]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const password = formData.get("password") as string;

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) return setError(data.error || "Reset failed");
      setSuccess(true);
    } catch {
      setError("Reset service unavailable");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <section className="panel w-full max-w-md p-7 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h1 className="text-xl font-semibold">Password updated</h1>
        <p className="text-slate-500 mt-2">Your password has been reset successfully.</p>
        <a className="mt-4 inline-block btn-primary" href="/login">Sign in</a>
      </section>
    );
  }

  return (
    <section className="panel w-full max-w-md p-7">
      <h1 className="text-xl font-bold">Reset your password</h1>
      <p className="text-slate-500 mt-2">Enter a new password for your account</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <label className="block text-sm font-semibold">New password<input name="password" type="password" required minLength={8} maxLength={128} className="field mt-1" /></label>
        <button disabled={loading} className="btn-primary w-full">{loading ? "Resetting…" : "Reset password"}</button>
      </form>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
