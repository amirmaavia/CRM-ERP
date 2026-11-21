"use client";

import { Loader } from "@/components/ui/loader";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  role: { name: string };
  createdAt: string;
  lastLoginAt?: string;
  lastActivityAt?: string;
  _count?: { leads: number; deals: number; createdInvoices: number; tenantLeads: number };
};

export type UsersResponse = {
  items: UserRow[];
  pagination: { page: number; pageSize: number; total: number; pages: number };
};

type UsersTableProps = {
  data: UsersResponse;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewUser: (user: UserRow) => void;
  selectedUser: UserRow | null;
  onCloseDetail: () => void;
};

export function UsersTable({ data, loading, onPageChange, onPageSizeChange, onViewUser, selectedUser, onCloseDetail }: UsersTableProps) {
  if (selectedUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">User Details</h2>
            <button onClick={onCloseDetail} className="text-slate-500 hover:text-slate-700">✕</button>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs text-slate-500">ID</p><p className="font-mono text-sm">{selectedUser.id}</p></div>
              <div><p className="text-xs text-slate-500">Email</p><p>{selectedUser.email}</p></div>
              <div><p className="text-xs text-slate-500">Name</p><p>{selectedUser.name}</p></div>
              <div><p className="text-xs text-slate-500">Role</p><p>{selectedUser.role.name.replaceAll("_", " ")}</p></div>
              <div><p className="text-xs text-slate-500">Status</p><p><span className={`rounded px-2 py-1 text-xs font-semibold ${selectedUser.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{selectedUser.status}</span></p></div>
              <div><p className="text-xs text-slate-500">Joined</p><p>{new Date(selectedUser.createdAt).toLocaleDateString()}</p></div>
            </div>
            {selectedUser.lastLoginAt && <div><p className="text-xs text-slate-500">Last Login</p><p>{new Date(selectedUser.lastLoginAt).toLocaleString()}</p></div>}
            <div><p className="text-xs text-slate-500">Last activity</p><p>{selectedUser.lastActivityAt ? new Date(selectedUser.lastActivityAt).toLocaleString() : "No recorded activity"}</p></div>
            <a className="text-blue-800 hover:underline" href={`/management/activity?userId=${encodeURIComponent(selectedUser.id)}`}>View activity history</a>
            {selectedUser._count && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-2">Usage Statistics</p>
                <div className="grid gap-2 sm:grid-cols-3 text-sm">
                  <div className="text-slate-500">Leads: <span className="font-semibold">{selectedUser._count.leads}</span></div>
                  <div className="text-slate-500">Deals: <span className="font-semibold">{selectedUser._count.deals}</span></div>
                  <div className="text-slate-500">Invoices: <span className="font-semibold">{selectedUser._count.createdInvoices}</span></div>
                </div>
              </div>
            )}
            <div className="flex justify-end pt-4 border-t"><button onClick={onCloseDetail} className="btn-secondary">Close</button></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center"><Loader label="Loading users…" /></td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">No users found</td></tr>
            ) : (
              data.items.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3"><p className="font-semibold">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td>
                  <td className="px-4 py-3">{user.role.name.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-1 text-xs font-semibold ${user.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{user.status}</span></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-500">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => onViewUser(user)} className="text-sm font-semibold text-blue-800 hover:underline">View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t p-4 text-sm">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select value={data.pagination.pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="field w-20">
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>per page</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onPageChange(data.pagination.page - 1)} disabled={data.pagination.page <= 1 || loading} className="btn-secondary">Previous</button>
          <span>Page {data.pagination.page} of {Math.max(data.pagination.pages, 1)}</span>
          <button onClick={() => onPageChange(data.pagination.page + 1)} disabled={data.pagination.page >= data.pagination.pages || loading} className="btn-secondary">Next</button>
        </div>
      </div>
    </div>
  );
}
