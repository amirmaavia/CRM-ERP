"use client";

import { useCallback, useEffect, useState } from "react";
import { ReportData, ReportTab, reportDataSchema } from "@/lib/contracts/reports";
import { Loader, PageLoader } from "@/components/ui/loader";

const today = new Date().toISOString().slice(0, 10);
const yearStart = `${new Date().getFullYear()}-01-01`;
const tabs: ReportTab[] = ["sales", "receivables", "payables", "stockValuation", "cashBook", "staffPerformance"];

export function ReportsView() {
  const [data, setData] = useState<ReportData>();
  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState<ReportTab>("sales");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(readError(payload));
      const parsed = reportDataSchema.safeParse(payload);
      if (!parsed.success) throw new Error("The reports service returned incomplete data. Please contact an administrator.");
      setData(parsed.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { void load(); }, []);

  function exportCsv() {
    if (!data) return;
    const rows = data[tab] ?? [];
    const keys = rows.length ? Object.keys(rows[0] ?? {}) : [];
    const content = [keys.join(","), ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
    const href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `${tab}-${from}-${to}.csv`;
    link.click();
    URL.revokeObjectURL(href);
  }

  if (!data && loading) return <PageLoader label="Loading reports…" />;
  if (!data) return <ErrorMessage message={error} retry={load} />;
  const rows = data[tab] ?? [];

  return <div className="space-y-5 print:bg-white">
    <div className="flex flex-wrap justify-between gap-4 print:hidden">
      <div><h1 className="text-2xl font-bold">Accounting &amp; Business Reports</h1><p className="text-sm text-slate-500">Financial statements, aging, stock and performance.</p></div>
      <div className="flex flex-wrap gap-2"><input className="field w-auto" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /><input className="field w-auto" type="date" value={to} onChange={(event) => setTo(event.target.value)} /><button className="btn-secondary" disabled={loading} onClick={() => void load()}>{loading ? <Loader label="Loading…" /> : "Apply"}</button><button className="btn-secondary" onClick={exportCsv}>Export CSV</button><button className="btn-primary" onClick={() => window.print()}>Print / PDF</button></div>
    </div>
    {error && <p className="bg-red-50 p-3 text-red-700">{error}</p>}
    <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">{Object.entries(data.profitLoss).map(([key, value]) => <article className="panel p-4" key={key}><p className="text-xs uppercase text-slate-500">{label(key)}</p><p className={`mt-2 text-xl font-bold ${key === "netProfit" && value < 0 ? "text-red-700" : "text-slate-800"}`}>PKR {value.toLocaleString()}</p></article>)}</section>
    <section className="panel p-5"><h2 className="font-bold">Receivable Aging</h2><div className="mt-4 grid gap-4 sm:grid-cols-3"><AgingCard title="0–30 days" value={data.aging.days0to30} color="green" /><AgingCard title="31–60 days" value={data.aging.days31to60} color="amber" /><AgingCard title="60+ days" value={data.aging.days60plus} color="red" /></div></section>
    <div className="flex gap-1 overflow-x-auto border-b print:hidden">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap px-4 py-3 text-sm ${tab === item ? "border-b-2 border-blue-800 font-bold" : ""}`}>{label(item)}</button>)}</div>
    <section className="panel overflow-x-auto"><h2 className="border-b p-4 font-bold capitalize">{label(tab)}</h2><DataTable rows={rows} /></section>
  </div>;
}

function AgingCard({ title, value, color }: { title: string; value: number; color: "green" | "amber" | "red" }) { const colors = { green: "bg-green-50", amber: "bg-amber-50", red: "bg-red-50" }; return <div className={`rounded p-4 ${colors[color]}`}><p className="text-xs">{title}</p><b>PKR {value.toLocaleString()}</b></div>; }
function DataTable({ rows }: { rows: Array<Record<string, unknown>> }) { const keys = rows.length ? Object.keys(rows[0] ?? {}).filter((key) => key !== "id") : []; return <table className="w-full text-sm"><thead className="bg-slate-50"><tr>{keys.map((key) => <th className="p-3 text-left capitalize" key={key}>{label(key)}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row, index) => <tr key={index}>{keys.map((key) => <td className="p-3" key={key}>{format(row[key])}</td>)}</tr>)}{!rows.length && <tr><td className="p-8 text-center text-slate-400">No records for this period.</td></tr>}</tbody></table>; }
function ErrorMessage({ message, retry }: { message: string; retry: () => Promise<void> }) { return <div className="panel max-w-xl p-6"><h1 className="text-lg font-bold">Reports could not be loaded</h1><p className="mt-2 text-sm text-red-700">{message}</p><button className="btn-primary mt-4" onClick={() => void retry()}>Try again</button></div>; }
function readError(payload: unknown) { return typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "Unable to load reports."; }
function label(value: string) { return value.replaceAll(/([A-Z])/g, " $1"); }
function format(value: unknown) { if (typeof value === "number") return value.toLocaleString(); if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleDateString(); return String(value ?? "—"); }
