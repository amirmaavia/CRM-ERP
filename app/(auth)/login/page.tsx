import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return <section className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_24px_70px_-24px_rgba(30,41,59,.3)]">
    <header className="border-b border-slate-100 px-7 pb-6 pt-8 sm:px-9">
      <div className="mb-7 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-black text-white shadow-lg shadow-indigo-200">N</span><div><p className="font-bold tracking-tight text-slate-900">Nexa ERP</p><p className="text-xs text-slate-500">Run business, clearly.</p></div></div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1><p className="mt-2 text-sm text-slate-500">Sign in to continue to your workspace.</p>
    </header>
    <div className="px-7 py-7 sm:px-9"><Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}><LoginForm /></Suspense><p className="mt-6 text-center text-xs text-slate-400">Protected business access · Nexa ERP</p></div>
  </section>;
}
