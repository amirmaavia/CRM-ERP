"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type IconName = "home" | "building" | "users" | "pipeline" | "tasks" | "box" | "truck" | "invoice" | "wallet" | "chart" | "activity" | "help" | "settings" | "profile" | "upload" | "shield";
type NavItem = { href: string; label: string; permission?: string; icon: IconName };

const links: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "home" },
  { href: "/dashboard/companies", label: "Customer & vendor ledgers", permission: "ledgers.read", icon: "building" },
  { href: "/dashboard/contacts", label: "Contacts & leads", permission: "crm.read", icon: "users" },
  { href: "/dashboard/deals", label: "Deals pipeline", permission: "crm.read", icon: "pipeline" },
  { href: "/dashboard/tasks", label: "Tasks", permission: "crm.read", icon: "tasks" },
  { href: "/dashboard/inventory", label: "Inventory", permission: "inventory.read", icon: "box" },
  { href: "/dashboard/suppliers", label: "Purchases", permission: "vendors.read", icon: "truck" },
  { href: "/dashboard/invoices", label: "Sales & invoices", permission: "sales.read", icon: "invoice" },
  { href: "/dashboard/payments", label: "Receipts & payments", permission: "payments.read", icon: "wallet" },
  { href: "/dashboard/reports", label: "Reports", permission: "reports.read", icon: "chart" },
  { href: "/dashboard/activity", label: "My activity", icon: "activity" },
  { href: "/dashboard/help", label: "Help & guide", icon: "help" },
];

function Mark() {
  return <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-black text-white shadow-lg shadow-indigo-950/30">N</span>;
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
    building: <><path d="M4 21V5l8-3 8 3v16M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M9 21v-5h6v5"/></>,
    users: <><circle cx="9" cy="8" r="4"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 3.5a4 4 0 0 1 0 7.5M18 15a6 6 0 0 1 3 5"/></>,
    pipeline: <><path d="M4 5h16M4 12h10M4 19h6"/><circle cx="18" cy="12" r="2"/><circle cx="14" cy="19" r="2"/></>,
    tasks: <><path d="m4 6 2 2 4-4M4 14l2 2 4-4M13 7h7M13 15h7"/></>,
    box: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7v10l8 4 8-4V7M12 11v10"/></>,
    truck: <><path d="M3 5h11v12H3zM14 9h4l3 4v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    invoice: <><path d="M6 2h9l4 4v16H6zM14 2v5h5M9 12h6M9 16h6"/></>,
    wallet: <><path d="M3 6h16a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2z"/><path d="M17 11h4v5h-4a2.5 2.5 0 0 1 0-5Z"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    activity: <path d="M3 12h4l2-7 4 14 2-7h6"/>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1.1.9-1.1 1.7M12 17h.01"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    upload: <><path d="M12 16V3m0 0L7 8m5-5 5 5M4 14v6h16v-6"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">{paths[name]}</svg>;
}

export function Sidebar({ role, permissions, isOwner = false }: { role: string; permissions: string[]; isOwner?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isPlatformAdmin = role === "PLATFORM_ADMIN";
  const visible = links.filter((item) => !item.permission || permissions.includes(item.permission));
  const active = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    if (href === "/management" && (pathname === "/admin" || pathname.startsWith("/admin/"))) return true;
    if (href === "/dashboard/management" && pathname === "/dashboard/sub-users") return true;
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  const itemClass = (href: string) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${active(href) ? "bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400/50" : "text-slate-400 hover:bg-white/[.06] hover:text-white"}`;

  const navigation = <>
    <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.18em] text-slate-600">Workspace</div>
    {visible.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={itemClass(item.href)} aria-current={active(item.href) ? (pathname === item.href ? "page" : "location") : undefined}><span className={active(item.href) ? "text-indigo-300" : "text-slate-500 group-hover:text-slate-300"}><Icon name={item.icon}/></span><span className="truncate">{item.label}</span></Link>)}
    <div className="my-3 border-t border-white/[.07]" />
    {(isOwner || permissions.includes("business.users.manage")) && <Link href="/dashboard/management" onClick={() => setOpen(false)} className={itemClass("/dashboard/management")} aria-current={active("/dashboard/management") ? (pathname === "/dashboard/management" ? "page" : "location") : undefined}><Icon name="shield"/>Management tools</Link>}
    {permissions.includes("settings.manage") && <Link href="/dashboard/settings" onClick={() => setOpen(false)} className={itemClass("/dashboard/settings")} aria-current={active("/dashboard/settings") ? (pathname === "/dashboard/settings" ? "page" : "location") : undefined}><Icon name="settings"/>Business settings</Link>}
    <Link href="/dashboard/profile" onClick={() => setOpen(false)} className={itemClass("/dashboard/profile")} aria-current={active("/dashboard/profile") ? (pathname === "/dashboard/profile" ? "page" : "location") : undefined}><Icon name="profile"/>Profile</Link>
    {isPlatformAdmin && <><div className="my-3 border-t border-white/[.07]"/><div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.18em] text-slate-600">Platform</div><Link href="/dashboard/import" onClick={() => setOpen(false)} className={itemClass("/dashboard/import")} aria-current={active("/dashboard/import") ? (pathname === "/dashboard/import" ? "page" : "location") : undefined}><Icon name="upload"/>Excel import</Link><Link href="/management" onClick={() => setOpen(false)} className={itemClass("/management")} aria-current={active("/management") ? (pathname === "/management" ? "page" : "location") : undefined}><Icon name="shield"/>Administration</Link>{active("/management") && <div className="ml-5 space-y-1 border-l border-indigo-400/30 pl-3" aria-label="Administration pages">{[
      { href: "/admin/users", label: "Users & roles" },
      { href: "/management/users", label: "All users" },
      { href: "/management/analytics", label: "Analytics" },
      { href: "/management/activity", label: "Activity" },
    ].map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={itemClass(item.href)} aria-current={active(item.href) ? (pathname === item.href ? "page" : "location") : undefined}>{item.label}</Link>)}</div>}</>}
  </>;

  return <>
    <button onClick={() => setOpen(true)} className="fixed left-4 top-3 z-40 grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden" aria-label="Open navigation" aria-expanded={open}><span className="text-xl leading-none">☰</span></button>
    {open && <button className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm md:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#101827] text-slate-200 shadow-2xl transition-transform duration-300 md:w-64 md:translate-x-0 md:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-20 items-center gap-3 border-b border-white/[.07] px-5"><Mark/><div><p className="font-bold tracking-tight text-white">Nexa ERP</p><p className="text-[11px] text-slate-500">Run business, clearly.</p></div><button onClick={() => setOpen(false)} className="ml-auto text-2xl text-slate-500 md:hidden" aria-label="Close navigation">×</button></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">{navigation}</nav>
      <div className="border-t border-white/[.07] px-5 py-4 text-[11px] text-slate-600">Nexa workspace · Secure access</div>
    </aside>
  </>;
}
