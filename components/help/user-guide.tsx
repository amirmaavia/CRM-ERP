"use client";

import Link from "next/link";
import { useState } from "react";
import guides from "@/lib/help/user-guides.json";

export function UserGuide({ role, permissions }: { role: string; permissions: string[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All topics");
  const categories = ["All topics", ...Array.from(new Set(guides.map((guide) => guide.category)))];
  const visible = guides.filter((guide) => (category === "All topics" || guide.category === category) && `${guide.title} ${guide.steps.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()));
  function canOpen(href: string) {
    if (["/admin/users", "/dashboard/import", "/dashboard/settings"].includes(href)) return role === "PLATFORM_ADMIN";
    const permission = ({ "/dashboard/companies": "ledgers.read", "/dashboard/reports": "reports.read", "/dashboard/invoices": "sales.read", "/dashboard/payments": "payments.read", "/dashboard/inventory": "inventory.read", "/dashboard/suppliers": "vendors.read", "/dashboard/contacts": "crm.read", "/dashboard/deals": "crm.read" } as Record<string, string>)[href];
    return !permission || permissions.includes(permission);
  }
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold">Help & User Guide</h1><p className="mt-1 text-sm text-slate-500">Start with your first login, then follow the steps for each business task.</p></header>
    <section className="panel border-l-4 border-blue-800 p-5"><h2 className="font-bold">Your first working day</h2><p className="mt-2 text-sm text-slate-600">Sign in ? Change password ? Confirm workspace ? Add customers and products ? Receive stock ? Create a sale ? Record money received ? Review the ledger.</p><p className="mt-2 text-sm text-slate-600">Your role: {role.replaceAll("_", " ")}. Business owners can create staff in Management Tools. Only the system administrator creates business-owner and administrator accounts. Some tasks require a different role; ask your administrator when access is unavailable.</p></section>
    <div className="panel flex flex-wrap items-end gap-3 p-4"><label className="min-w-0 flex-1 text-sm font-semibold" htmlFor="guide-search">Find a task<input id="guide-search" className="field mt-1" placeholder="Search: first login, sale, stock, password..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="text-sm font-semibold" htmlFor="guide-category">Topic<select id="guide-category" className="field mt-1" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><button className="btn-secondary" onClick={() => { setSearch(""); setCategory("All topics"); }}>Show all</button></div>
    <p role="status" className="text-sm text-slate-500">{visible.length} of {guides.length} guides</p>
    <div className="grid gap-4 lg:grid-cols-2">{visible.map((guide) => <section id={guide.id} key={guide.id} className="panel scroll-mt-5 p-5"><p className="text-xs font-semibold uppercase text-blue-800">{guide.category}</p><h2 className="mt-1 text-lg font-bold">{guide.title}</h2><ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-600">{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol>{canOpen(guide.href) ? <Link href={guide.href} className="mt-4 inline-block font-semibold text-blue-800 hover:underline">Open this screen ?</Link> : <p className="mt-4 text-sm text-slate-500">Ask an authorized colleague or administrator to perform this task.</p>}</section>)}</div>
    {visible.length === 0 && <div className="panel p-6">No guide matches your search. Try a shorter term or choose All topics.</div>}
    <section className="panel p-5"><h2 className="font-bold">Practice before entering live records</h2><p className="mt-2 text-sm leading-6 text-slate-600">In an administrator-approved test workspace, receive 5 units, sell 2 on credit, record the payment and check that 3 units remain. Review the invoice and ledger. Do not enter practice transactions in your live business books.</p></section>
  </div>;
}
