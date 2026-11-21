"use client";

import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type DashboardData = {
  scope: "personal" | "company";
  canViewFinance: boolean;
  kpis: { totalCustomers: number; totalLeads: number; totalRevenue: number; thisMonthSales: number; openDeals: number; totalReceivables: number; totalPayables: number; lowStockItems: number };
  pipeline: Array<{ stage: string; deals: number; value: number }>;
  monthlySales: Array<{ month: string; revenue: number }>;
  upcomingTasks: Array<{ id: string; title: string; dueAt: string; priority: string; status: string; assignedTo: { name: string } | null }>;
  recentActivity: Array<{ id: string; action: string; entityType: string; description: string | null; createdAt: string; user: { name: string } | null }>;
};

const money = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-PK");

async function loadDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/dashboard");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not load dashboard");
  return data;
}

function LoadingDashboard() {
  return <div className="space-y-5 animate-pulse"><div className="h-16 rounded bg-slate-200" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 rounded bg-slate-200" />)}</div><div className="grid gap-5 xl:grid-cols-2"><div className="h-80 rounded bg-slate-200" /><div className="h-80 rounded bg-slate-200" /></div></div>;
}

export function DashboardView({ heading, description }: { heading: string; description: string }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ["dashboard"], queryFn: loadDashboard });
  if (isLoading) return <LoadingDashboard />;
  if (error || !data) return <div className="panel p-8 text-center"><h2 className="font-bold text-red-700">Dashboard unavailable</h2><p className="mt-2 text-sm text-slate-500">{error instanceof Error ? error.message : "An unexpected error occurred."}</p><button className="btn-primary mt-5" onClick={() => refetch()}>Try again</button></div>;

  const cards = [
    { label: "Total Customers", value: number.format(data.kpis.totalCustomers), detail: "Active customer records", color: "border-l-blue-700" },
    { label: data.scope === "personal" ? "My Leads" : "Total Leads", value: number.format(data.kpis.totalLeads), detail: data.scope === "personal" ? "Assigned to you" : "Across the company", color: "border-l-cyan-700" },
    { label: data.scope === "personal" ? "My Open Deals" : "Open Deals", value: number.format(data.kpis.openDeals), detail: "Active pipeline opportunities", color: "border-l-indigo-700" },
    { label: "Low Stock Items", value: number.format(data.kpis.lowStockItems), detail: "At or below minimum", color: data.kpis.lowStockItems ? "border-l-red-600" : "border-l-green-600" },
    ...(data.canViewFinance ? [
      { label: "Total Revenue", value: money.format(data.kpis.totalRevenue), detail: "Non-void invoice total", color: "border-l-green-700" },
      { label: "This Month's Sales", value: money.format(data.kpis.thisMonthSales), detail: "Current calendar month", color: "border-l-emerald-700" },
      { label: "Receivables", value: money.format(data.kpis.totalReceivables), detail: "Outstanding from customers", color: "border-l-amber-600" },
      { label: "Payables", value: money.format(data.kpis.totalPayables), detail: "Outstanding to suppliers", color: "border-l-orange-700" },
    ] : []),
  ];

  return <div className="space-y-6">
    <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-slate-800">{heading}</h1><span className="rounded bg-slate-200 px-2 py-1 text-xs font-semibold uppercase text-slate-600">{data.scope}</span></div><p className="mt-1 text-sm text-slate-500">{description}</p></div><button className="btn-secondary" disabled={isFetching} onClick={() => refetch()}>{isFetching ? "Refreshing…" : "Refresh"}</button></div>
    <section aria-label="Key performance indicators" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <article className={`panel border-l-4 p-5 ${card.color}`} key={card.label}><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{card.label}</p><p className="mt-2 text-2xl font-bold text-slate-800">{card.value}</p><p className="mt-2 text-xs text-slate-400">{card.detail}</p></article>)}</section>
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="panel p-5"><div className="mb-5"><h2 className="font-bold">Sales Pipeline</h2><p className="text-xs text-slate-500">Deal count and value by stage</p></div><div className="h-72">{data.pipeline.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.pipeline.map((item) => ({ ...item, stage: item.stage.replaceAll("_", " ") }))}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="stage" tick={{ fontSize: 11 }} /><YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fontSize: 11 }} /><Tooltip formatter={(value, name) => name === "value" ? money.format(Number(value)) : number.format(Number(value))} /><Legend /><Bar yAxisId="left" dataKey="deals" name="Deals" fill="#1d4ed8" /><Bar yAxisId="right" dataKey="value" name="Value" fill="#64748b" /></BarChart></ResponsiveContainer> : <Empty label="No deals in the pipeline yet." />}</div></section>
      {data.canViewFinance && <section className="panel p-5"><div className="mb-5"><h2 className="font-bold">Revenue Trend</h2><p className="text-xs text-slate-500">Invoice totals over the last six months</p></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.monthlySales}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fontSize: 11 }} /><Tooltip formatter={(value) => money.format(Number(value))} /><Line type="monotone" dataKey="revenue" name="Revenue" stroke="#047857" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></section>}
      <section className="panel overflow-hidden"><div className="border-b px-5 py-4"><h2 className="font-bold">Upcoming Tasks</h2><p className="text-xs text-slate-500">Open work ordered by due date</p></div>{data.upcomingTasks.length ? <ul className="divide-y">{data.upcomingTasks.map((task) => <li className="flex items-center justify-between gap-4 px-5 py-4" key={task.id}><div><p className="text-sm font-semibold">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.assignedTo?.name ?? "Unassigned"} · {task.status.replaceAll("_", " ")}</p></div><div className="text-right"><p className={`text-xs font-bold ${task.priority === "URGENT" || task.priority === "HIGH" ? "text-red-600" : "text-slate-500"}`}>{task.priority}</p><p className="mt-1 text-xs text-slate-500">{new Date(task.dueAt).toLocaleDateString()}</p></div></li>)}</ul> : <Empty label="No upcoming tasks." />}</section>
      <section className="panel overflow-hidden"><div className="border-b px-5 py-4"><h2 className="font-bold">Recent Activity</h2><p className="text-xs text-slate-500">Latest recorded business actions</p></div>{data.recentActivity.length ? <ul className="divide-y">{data.recentActivity.map((activity) => <li className="px-5 py-3" key={activity.id}><div className="flex justify-between gap-3"><p className="text-sm"><span className="font-semibold">{activity.user?.name ?? "System"}</span> {activity.description ?? `${activity.action.toLowerCase()}d ${activity.entityType}`}</p><time className="whitespace-nowrap text-xs text-slate-400">{new Date(activity.createdAt).toLocaleString()}</time></div><span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{activity.action}</span></li>)}</ul> : <Empty label="No activity has been recorded." />}</section>
    </div>
  </div>;
}

function Empty({ label }: { label: string }) { return <div className="flex min-h-40 items-center justify-center p-6 text-sm text-slate-400">{label}</div>; }
