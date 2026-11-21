"use client";

import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true);
    const email = new FormData(event.currentTarget).get("email");
    try {
    const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json(); setMessage(data.message ?? data.error); setLoading(false);
    } catch { setMessage("Password recovery is temporarily unavailable."); } finally { setLoading(false); }
  }
  return <form onSubmit={submit} className="space-y-4"><p className="text-sm text-slate-600">Enter your account email. We will email you a link to reset your password.</p>{message && <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}<label className="block text-sm font-semibold">Email<input name="email" type="email" required className="field mt-1" /></label><button disabled={loading} className="btn-primary w-full">{loading ? "Submitting…" : "Request reset"}</button><a className="block text-center text-sm text-blue-800 hover:underline" href="/login">Return to sign in</a></form>;
}
