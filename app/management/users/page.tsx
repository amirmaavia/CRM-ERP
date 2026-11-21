"use client";

import Link from "next/link";
import { RoleName } from "@prisma/client";
import { useEffect, useState, useCallback } from "react";
import { UsersTable, UserRow, UsersResponse } from "@/components/management/users-table";

export default function ManagementUsersPage() {
  const [data, setData] = useState<UsersResponse>({ items: [], pagination: { page: 1, pageSize: 10, total: 0, pages: 0 } });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [registeredFrom, setRegisteredFrom] = useState("");
  const [registeredTo, setRegisteredTo] = useState("");
  const [activeSince, setActiveSince] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (registeredFrom) params.set("registeredFrom", registeredFrom);
      if (registeredTo) params.set("registeredTo", registeredTo);
      if (activeSince) params.set("activeSince", activeSince);
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (role) params.set("role", role);
      const response = await fetch(`/api/management/users?${params}`);
      if (!response.ok) throw new Error((await response.json()).error || "Failed to load users");
      setData(await response.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, role, registeredFrom, registeredTo, activeSince]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">User Management</h1><p className="text-slate-500">View and manage platform users</p></div><Link href="/admin/users" className="btn-primary">Create user / Manage access</Link>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="panel p-4">
        <div className="flex flex-wrap gap-4">
          <input className="field max-w-sm" placeholder="Search name, email or ID…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <label className="text-sm">Registered from<input aria-label="Registered from" className="field" type="date" value={registeredFrom} onChange={(e) => { setRegisteredFrom(e.target.value); setPage(1); }} /></label>
          <label className="text-sm">Registered through<input aria-label="Registered through" className="field" type="date" value={registeredTo} onChange={(e) => { setRegisteredTo(e.target.value); setPage(1); }} /></label>
          <label className="text-sm">Active since<input aria-label="Active since" className="field" type="date" value={activeSince} onChange={(e) => { setActiveSince(e.target.value); setPage(1); }} /></label>
          <select className="field w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select className="field w-40" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">All Roles</option>
            {Object.values(RoleName).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
        </div>
      </div>

      <UsersTable
        data={data}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onViewUser={setSelectedUser}
        selectedUser={selectedUser}
        onCloseDetail={() => setSelectedUser(null)}
      />
    </div>
  );
}