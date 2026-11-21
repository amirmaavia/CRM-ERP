"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type LedgerEntry = { id: string; date: string; reference: string; description: string; debit: number; credit: number; runningBalance: number; invoiceId?: string };
type Detail = {
  id: string; firstName: string; lastName?: string; email?: string; phone?: string; address?: string; currentBalance: number;
  company?: { id: string; name: string; supplierProfile?: { id: string } };
  summary: { totalPurchased: number; cashPurchased: number; creditPurchased: number; totalPaid: number; outstanding: number; invoiceCount: number; paymentCount: number };
  ledger: LedgerEntry[];
  notes: Array<{ id: string; content: string; createdAt: string; author: { name: string } }>;
};

const money = (value: number) => `PKR ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ContactProfile({ id }: { id: string }) {
  const [data, setData] = useState<Detail>();
  const [error, setError] = useState("");
  async function load() { const response = await fetch(`/api/contacts/${id}`); const payload = await response.json(); response.ok ? setData(payload) : setError(payload.error); }
  useEffect(() => { load(); }, [id]);
  async function note(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const element = event.currentTarget; const content = new FormData(event.currentTarget).get("content"); const response = await fetch(`/api/contacts/${id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) }); if (response.ok) { element.reset(); load(); } }
  if (error) return <p className="text-red-700">{error}</p>;
  if (!data) return <p>Loading customer...</p>;
  const name = `${data.firstName} ${data.lastName || ""}`.trim();
  const cards = [
    ["Customer Purchased From Us", data.summary.totalPurchased], ["Cash Purchases", data.summary.cashPurchased], ["Credit Purchases", data.summary.creditPurchased],
    ["Total Received", data.summary.totalPaid], ["Outstanding", data.summary.outstanding],
  ] as const;
  return <div className="space-y-5">
    <div className="print flex flex-wrap justify-end gap-2"><button className="btn-secondary" onClick={() => window.print()}>Print Customer Statement</button>{data.company && <Link className="btn-primary" href={`/dashboard/companies/${data.company.id}`}>Company Buy / Sell Ledger</Link>}</div>
    <div className="invoice-slip space-y-5 bg-white">
      <section className="panel p-6">
        <div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Customer Statement</p><h1 className="text-2xl font-bold">{name}</h1><p className="mt-1 text-sm text-slate-500">{data.company?.name || "Individual customer"}</p></div><div className="text-right"><p className="text-xs font-bold uppercase text-slate-500">Current Outstanding</p><p className={`text-xl font-bold ${data.currentBalance > 0 ? "text-amber-700" : "text-green-700"}`}>{money(data.currentBalance)}</p></div></div>
        <div className="mt-5 grid gap-3 border-t pt-4 text-sm sm:grid-cols-3"><p><b>Email:</b> {data.email || "—"}</p><p><b>Phone:</b> {data.phone || "—"}</p><p><b>Address:</b> {data.address || "—"}</p></div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label, value]) => <div className="panel p-4" key={label}><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-lg font-bold">{money(value)}</p></div>)}</section>
      {data.company?.supplierProfile && <section className="print panel border-blue-200 bg-blue-50 p-4 text-sm"><b>This customer is also linked to a supplier.</b> Open <Link className="font-bold text-blue-800 underline" href={`/dashboard/companies/${data.company.id}`}>Company Buy / Sell Ledger</Link> to see what you bought from the company, what you sold to it, cash/credit totals, and net balance together.</section>}
      <section className="panel overflow-x-auto"><div className="border-b p-4"><h2 className="font-bold">Complete Customer Ledger</h2><p className="text-xs text-slate-500">Cash bills remain here with their matching receipt even when balance becomes zero. {data.summary.invoiceCount} bills · {data.summary.paymentCount} receipts.</p></div><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Date / Reference</th><th className="p-3 text-left">Details</th><th className="p-3 text-right">Debit</th><th className="p-3 text-right">Credit</th><th className="p-3 text-right">Balance</th><th className="print p-3">Slip</th></tr></thead><tbody className="divide-y">{data.ledger.length === 0 ? <tr><td className="p-6 text-center text-slate-500" colSpan={6}>No purchases or payments recorded yet.</td></tr> : data.ledger.map((entry) => <tr key={`${entry.description}-${entry.id}`}><td className="p-3">{new Date(entry.date).toLocaleDateString()}<br/><span className="text-xs text-slate-500">{entry.reference}</span></td><td className="p-3">{entry.description}</td><td className="p-3 text-right">{entry.debit ? money(entry.debit) : "—"}</td><td className="p-3 text-right text-green-700">{entry.credit ? money(entry.credit) : "—"}</td><td className="p-3 text-right font-semibold">{money(entry.runningBalance)}</td><td className="print p-3 text-center">{entry.invoiceId ? <Link className="font-semibold text-blue-800" href={`/dashboard/invoices/${entry.invoiceId}`}>View / Print</Link> : "—"}</td></tr>)}</tbody></table></section>
    </div>
    <section className="print panel"><h2 className="border-b p-4 font-bold">Notes & Activity</h2><form onSubmit={note} className="flex gap-2 p-4"><input name="content" required className="field" placeholder="Add a note..."/><button className="btn-primary">Add</button></form><ul className="divide-y">{data.notes.map((item) => <li className="p-4" key={item.id}><p className="text-sm">{item.content}</p><p className="mt-1 text-xs text-slate-400">{item.author.name} · {new Date(item.createdAt).toLocaleString()}</p></li>)}</ul></section>
  </div>;
}
