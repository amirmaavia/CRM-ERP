"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

export function Header({ name, role }: { name?: string | null; role: string }) {
  const isPlatformAdmin = role === "PLATFORM_ADMIN";
  const initials = (name || "User").split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 pl-16 backdrop-blur md:px-7 md:pl-7">
    <div><p className="text-sm font-semibold text-slate-800">Business workspace</p><p className="hidden text-xs text-slate-500 sm:block">Here’s what’s happening today</p></div>
    <div className="flex items-center gap-2 sm:gap-4">
      <Link href="/dashboard/help" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 sm:block">Help center</Link>
      {isPlatformAdmin && <Link href="/management" className="hidden text-sm font-semibold text-indigo-700 hover:text-indigo-600 lg:block">Management</Link>}
      <Link href="/dashboard/profile" aria-label="Open profile" className="grid h-9 w-9 place-items-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100">{initials}</Link>
      <div className="hidden border-l border-slate-200 pl-4 text-right sm:block"><p className="text-sm font-semibold text-slate-800">{name || "Account"}</p><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{role.replaceAll("_", " ")}</p></div>
      <button className="btn-secondary !px-3" onClick={async () => { await createSupabaseBrowserClient().auth.signOut(); window.location.href = "/login"; }}><span className="hidden sm:inline">Sign out</span><span className="sm:hidden" aria-label="Sign out">↗</span></button>
    </div>
  </header>;
}
