"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Signup failed");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Signup service unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">Create your account to start managing your business.</p>
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <label className="block text-sm font-semibold">Name<input name="name" type="text" required minLength={2} maxLength={150} className="field mt-1" /></label>
      <label className="block text-sm font-semibold">Email<input name="email" type="email" required className="field mt-1" /></label>
      <label className="block text-sm font-semibold">Password<input name="password" type="password" required minLength={8} maxLength={128} className="field mt-1" /></label>
      <button disabled={loading} className="btn-primary w-full">{loading ? "Creating account…" : "Create account"}</button>
      <a className="block text-center text-sm text-blue-800 hover:underline" href="/login">Already have an account? Sign in</a>
    </form>
  );
}