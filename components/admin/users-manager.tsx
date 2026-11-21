"use client";

import { RoleName, UserStatus } from "@prisma/client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader } from "@/components/ui/loader";

type UserRow = { id: string; name: string; email: string; status: UserStatus; role: { name: RoleName }; createdAt: string };
type UsersResponse = { items: UserRow[]; pagination: { page: number; pages: number; total: number } };

export function UsersManager({ actorId, actorRole, subUsers = false, allowedRoles = Object.values(RoleName) }: { actorId: string; actorRole: RoleName; subUsers?: boolean; allowedRoles?: RoleName[] }) {
  const endpoint = subUsers ? "/api/sub-users" : "/api/users";
  const [data, setData] = useState<UsersResponse>({ items: [], pagination: { page: 1, pages: 0, total: 0 } });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${endpoint}?page=${page}&search=${encodeURIComponent(search)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load users");
      setData(payload);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not load users"); }
    finally { setLoading(false); }

  }, [page, search, endpoint]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const element = event.currentTarget;
    if (saving) return;
    setSaving(true);
    try {
      const form = new FormData(element);
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create user");
      element.reset();
      setOpen(false);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create user");
    } finally {
      setSaving(false);
    }
  }

  async function updateAccess(user: UserRow, values: { status?: UserStatus; role?: RoleName }) {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${endpoint}/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not update user");
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not update user"); }
    finally { setSaving(false); }
  }

  const isPlatformAdmin = actorRole === RoleName.PLATFORM_ADMIN;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{subUsers ? "Business Sub-users" : "Users & Roles"}</h1>
          <p className="text-sm text-slate-500">{subUsers ? "Staff share this business workspace. Available roles cannot exceed your access." : "Manage staff access and account status."}</p>
        </div>
        <button disabled={subUsers && allowedRoles.length === 0} className="btn-primary" onClick={() => setOpen(!open)}>{subUsers ? "+ Add sub-user" : "+ Add user"}</button>
      </div>
      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}<button className="float-right" onClick={() => setError("")}>×</button></div>}
      {open && (
        <form onSubmit={create} className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-semibold">Name<input name="name" className="field mt-1" required minLength={2} /></label>
          <label className="text-sm font-semibold">Email<input name="email" className="field mt-1" type="email" required /></label>
          <label className="text-sm font-semibold">Temporary password<input name="password" className="field mt-1" type="password" required minLength={8} /></label>
          <label className="text-sm font-semibold">
            Role
            <select name="role" className="field mt-1" defaultValue={allowedRoles.includes(RoleName.USER) ? RoleName.USER : allowedRoles[0]}>
              {allowedRoles
                .filter((role) => isPlatformAdmin || role !== RoleName.PLATFORM_ADMIN)
                .map((role) => <option key={role}>{role}</option>)}
            </select>
          </label>
          {!subUsers && <label className="text-sm font-semibold">Workspace<select name="workspace" className="field mt-1" defaultValue="INDEPENDENT"><option value="INDEPENDENT">Own isolated workspace</option><option value="SHARED">Share administrator workspace</option></select></label>}
          <div className="flex items-end"><button disabled={saving} className="btn-primary w-full">{saving ? "Creating?" : "Create user"}</button></div>
        </form>
      )}
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <input className="field max-w-sm" placeholder="Search name or email…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          <span className="text-sm text-slate-500">{data.pagination.total} users</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center"><Loader label="Loading users…" /></td></tr>
              ) : (
                data.items.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3"><p className="font-semibold">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td>
                    <td className="px-4 py-3"><select aria-label={`Role for ${user.name}`} className="field" value={user.role.name} disabled={saving || user.id === actorId} onChange={(e) => updateAccess(user, { role: e.target.value as RoleName })}>{allowedRoles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</select></td>
                    <td className="px-4 py-3"><span className={`rounded px-2 py-1 text-xs font-semibold ${user.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{user.status}</span></td>
                    <td className="px-4 py-3 text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={saving || user.id === actorId || (user.role.name === RoleName.PLATFORM_ADMIN && !isPlatformAdmin)}
                        onClick={() => updateAccess(user, { status: user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}
                        className="text-sm font-semibold text-blue-800 disabled:text-slate-300"
                      >
                        {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button><button disabled={saving || user.id === actorId || user.status === "SUSPENDED"} className="ml-3 text-red-700 disabled:text-slate-300" onClick={() => updateAccess(user, { status: "SUSPENDED" })}>Suspend</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t p-4 text-sm">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {data.pagination.page} of {Math.max(data.pagination.pages, 1)}</span>
          <button className="btn-secondary" disabled={page >= data.pagination.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
