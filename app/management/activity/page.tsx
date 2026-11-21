"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader } from "@/components/ui/loader";

type ActivityRow = { id: string; action: string; entityType: string; entityId: string | null; description: string | null; createdAt: string; user?: { id: string; name: string; email: string } | null };
type ActivityResponse = { items: ActivityRow[]; pagination: { page: number; pageSize: number; total: number; pages: number } };

export default function ManagementActivityPage() {
  const [data, setData] = useState<ActivityResponse>({ items: [], pagination: { page: 1, pageSize: 20, total: 0, pages: 0 } });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [failures, setFailures] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      const userId = new URLSearchParams(window.location.search).get("userId");
      if (userId) params.set("userId", userId);
      if (failures) params.set("failures", "true");
      if (search) params.set("search", search);
      if (action) params.set("action", action);
      if (entityType) params.set("entityType", entityType);
      const response = await fetch(`/api/management/activity?${params}`);
      if (!response.ok) throw new Error((await response.json()).error || "Failed to load activity");
      setData(await response.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, action, entityType, failures]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Activity Log</h1><p className="text-slate-500">Monitor platform activity and audit trail</p></div>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="panel p-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={failures} onChange={(e) => { setFailures(e.target.checked); setPage(1); }} />Failures only</label>
          <input className="field max-w-sm" placeholder="Search description…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className="field w-40" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">All Actions</option>
            <option value="STOCK_OVERRIDE">Stock override</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="CONVERT">Convert</option>
            <option value="PAYMENT">Payment</option>
            <option value="SIGNUP">Signup</option>
            <option value="PASSWORD_RESET">Password Reset</option>
            <option value="PASSWORD_CHANGE">Password Change</option>
            <option value="SETTINGS_CHANGE">Settings Change</option>
          </select>
          <select className="field w-40" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
            <option value="">All Entities</option>
            <option value="User">User</option>
            <option value="Lead">Lead</option>
            <option value="Contact">Contact</option>
            <option value="Deal">Deal</option>
            <option value="Invoice">Invoice</option>
            <option value="Payment">Payment</option>
            <option value="Product">Product</option>
            <option value="PurchaseOrder">Purchase Order</option>
            <option value="Task">Task</option>
          </select>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader label="Loading activity…" /></td></tr>
              ) : data.items.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No activity found</td></tr>
              ) : (
                data.items.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{log.user?.name || "System"} <span className="text-xs text-slate-400">({log.user?.email || "N/A"})</span></td>
                    <td className="px-4 py-3"><span className="rounded px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">{log.action}</span></td>
                    <td className="px-4 py-3">{log.entityType} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ""}</td>
                    <td className="px-4 py-3 text-slate-600">{log.description || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t p-4 text-sm">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="field w-20">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>per page</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1 || loading} className="btn-secondary">Previous</button>
            <span>Page {page} of {Math.max(data.pagination.pages, 1)}</span>
            <button onClick={() => setPage(page + 1)} disabled={page >= data.pagination.pages || loading} className="btn-secondary">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
