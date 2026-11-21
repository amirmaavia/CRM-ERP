"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { loginSchema } from "@/lib/validations/auth";

type FormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(loginSchema) });
  async function submit(data: FormData) {
    setError("");
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email: data.email.trim().toLowerCase(), password: data.password });
      if (error) return setError("Invalid email or password, or the account is inactive.");
      const target = new URL(params.get("callbackUrl") || "/dashboard", window.location.origin);
      window.location.href = target.origin === window.location.origin ? target.href : "/dashboard";
    } catch {
      setError("The authentication service is temporarily unavailable.");
    }
  }
  return <form onSubmit={handleSubmit(submit)} className="space-y-4">
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <label className="block text-sm font-semibold text-slate-700">Email address<input className="field mt-2" type="email" autoComplete="email" placeholder="you@company.com" {...register("email")} /></label>
    {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
    <label className="block text-sm font-semibold text-slate-700">Password<input className="field mt-2" type="password" autoComplete="current-password" placeholder="Enter your password" {...register("password")} /></label>
    {errors.password && <p className="text-xs text-red-600">Password must be at least 8 characters.</p>}
    <div className="flex items-center justify-end"><a href="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Forgot password?</a></div>
    <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in to workspace"}</button>
  </form>;
}
