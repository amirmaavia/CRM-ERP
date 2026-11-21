"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { BUSINESS_ACCESS, permissionsForAccess } from "@/lib/auth/business-access";

type Member = { id: string; name: string; email: string; status: string; businessAccess: string[] };
export function BusinessManagement({ actorId, permissions }: { actorId: string; permissions: string[] }) {
  const [users, setUsers] = useState<Member[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Member | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const available = BUSINESS_ACCESS.filter(group => permissionsForAccess([group.key]).every(key => permissions.includes(key)));
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/business/users?page=${page}&search=${encodeURIComponent(search)}`, { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load business users");
      setUsers(data.items); setPages(Math.max(1, data.pagination.pages));
    } catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setError(error instanceof Error ? error.message : "Could not load users"); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [page, search]);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => load(controller.signal), 200); return () => { clearTimeout(timer); controller.abort(); }; }, [load]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(editing ? `/api/business/users/${editing.id}` : "/api/business/users", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { businessAccess: selected } : { name: form.get("name"), email: form.get("email"), password: form.get("password"), role: "USER", businessAccess: selected }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save access");
      setOpen(false); setEditing(null); setMessage("Business user access saved."); await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save user"); }
    finally { setBusy(false); }
  }
  async function status(user: Member, value: string) {
    if (busy) return; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/business/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: value }) });
      if (!response.ok) throw new Error((await response.json()).error || "Could not update status"); await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not update status"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Management Tools</h1><p className="text-sm text-slate-500">Users and access for this business only.</p></div><button disabled={busy} className="btn-primary" onClick={() => { setEditing(null); setSelected([]); setOpen(true); }}>+ Add business user</button></div>
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}{message && <p role="status" className="rounded bg-green-50 p-3 text-green-800">{message}</p>}
    {open && <form onSubmit={save} className="panel space-y-4 p-5"><h2 className="font-bold">{editing ? `Edit access: ${editing.name}` : "Create business user"}</h2>
      {!editing && <div className="grid gap-3 sm:grid-cols-3"><label>Name<input name="name" required minLength={2} maxLength={150} className="field" /></label><label>Email<input name="email" type="email" required className="field" /></label><label>Temporary password<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className="field" /></label></div>}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} className="btn-secondary" onClick={() => setSelected(available.map(group => group.key))}>All business access (Business admin)</button><button type="button" disabled={busy} className="btn-secondary" onClick={() => setSelected([])}>Clear all</button></div>
      <p className="text-sm text-slate-500">Choose multiple options. Business admin access never grants platform administration or access to another business. With no options selected, the user has only basic account access.</p>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2"><legend className="mb-2 font-semibold">Allowed operations</legend>{available.map(group => <label key={group.key} className="flex items-start gap-3 rounded border p-3"><input className="mt-1" type="checkbox" checked={selected.includes(group.key)} onChange={event => setSelected(current => event.target.checked ? [...current, group.key] : current.filter(key => key !== group.key))} /><span><span className="font-semibold">{group.label}</span><span className="mt-1 block text-xs text-slate-500">{group.description}</span></span></label>)}</fieldset>
      <div className="flex gap-3"><button disabled={busy} className="btn-primary">{busy ? "Saving..." : "Save user access"}</button><button type="button" disabled={busy} className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>}
    <section className="panel overflow-hidden"><div className="p-4"><label className="text-sm">Search business users<input className="field mt-1 max-w-md" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Name or email" /></label></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-4">User</th><th className="p-4">Access options</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody>{users.map(user => <tr className="border-t" key={user.id}><td className="p-4"><b>{user.name}</b><p>{user.email}</p></td><td className="max-w-md p-4">{BUSINESS_ACCESS.filter(group => user.businessAccess.includes(group.key)).map(group => group.label).join(", ") || "Basic account access"}</td><td className="p-4">{user.status}</td><td className="p-4"><div className="flex gap-3"><button disabled={busy || user.id === actorId} className="text-blue-800 disabled:text-slate-400" onClick={() => { setEditing(user); setSelected(user.businessAccess); setOpen(true); }}>Edit access</button><button disabled={busy || user.id === actorId} onClick={() => status(user, user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>{user.status === "ACTIVE" ? "Deactivate" : "Activate"}</button><button disabled={busy || user.id === actorId || user.status === "SUSPENDED"} onClick={() => status(user, "SUSPENDED")}>Suspend</button></div></td></tr>)}</tbody></table></div>{loading && <p role="status" className="p-4">Loading users...</p>}{!loading && !users.length && <p className="p-4">No business users found.</p>}<div className="flex justify-between p-4"><button className="btn-secondary" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {pages}</span><button className="btn-secondary" disabled={loading || page >= pages} onClick={() => setPage(page + 1)}>Next</button></div></section>
  </div>;
}
