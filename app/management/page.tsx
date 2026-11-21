"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRow, UsersResponse } from "@/components/management/users-table";
import { PageLoader } from "@/components/ui/loader";

type ActivityRow = { id: string; action: string; entityType: string; entityId: string | null; description: string | null; createdAt: string; user?: { id: string; name: string; email: string } | null };

type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  recentSignups: number;
  totalRevenue: number;
};

export default function ManagementDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, activeUsers: 0, inactiveUsers: 0, recentSignups: 0, totalRevenue: 0 });
  const [recentUsers, setRecentUsers] = useState<UserRow[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [statsRes, usersRes, activityRes] = await Promise.all([
          fetch("/api/management/stats"),
          fetch("/api/management/users?page=1&pageSize=5&sort=createdAt&order=desc"),
          fetch("/api/management/activity?page=1&pageSize=10"),
        ]);
        if (!statsRes.ok || !usersRes.ok || !activityRes.ok) throw new Error("Failed to load dashboard");
        if (statsRes.ok) setStats(await statsRes.json());
        if (usersRes.ok) setRecentUsers((await usersRes.json()).items);
        if (activityRes.ok) setRecentActivity((await activityRes.json()).items);
      } catch {
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageLoader label="Loading dashboard…" />;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Management Dashboard</h1><p className="text-slate-500">Platform overview and quick actions</p></div>
        <Link href="/management/users" className="btn-primary">View all users</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="panel p-4"><p className="text-sm text-slate-500">Total Users</p><p className="text-3xl font-bold">{stats.totalUsers}</p></div>
        <div className="panel p-4"><p className="text-sm text-slate-500">Active</p><p className="text-3xl font-bold text-green-700">{stats.activeUsers}</p></div>
        <div className="panel p-4"><p className="text-sm text-slate-500">Inactive</p><p className="text-3xl font-bold text-slate-600">{stats.inactiveUsers}</p></div>
        <div className="panel p-4"><p className="text-sm text-slate-500">Recent Signups (30d)</p><p className="text-3xl font-bold">{stats.recentSignups}</p></div>
        <div className="panel p-4"><p className="text-sm text-slate-500">Platform Revenue</p><p className="text-3xl font-bold">PKR {stats.totalRevenue.toLocaleString()}</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="panel">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">Recent Users</h2>
            <Link href="/management/users" className="text-sm text-blue-800 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Joined</th></tr></thead>
              <tbody className="divide-y">
                {recentUsers.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">No users found</td></tr> : recentUsers.map((user) => (
                  <tr key={user.id}><td className="px-4 py-3"><p className="font-semibold">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="px-4 py-3">{user.role.name.replaceAll("_", " ")}</td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-xs font-semibold ${user.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{user.status}</span></td><td className="px-4 py-3 text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
            <Link href="/management/activity" className="text-sm text-blue-800 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Time</th></tr></thead>
              <tbody className="divide-y">
                {recentActivity.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">No activity</td></tr> : recentActivity.map((log) => (
                  <tr key={log.id}><td className="px-4 py-3">{log.user?.name || "System"}</td><td className="px-4 py-3">{log.action}</td><td className="px-4 py-3">{log.entityType} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ""}</td><td className="px-4 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Link href="/management/users" className="btn-primary flex-1 text-center">Manage Users</Link>
        <Link href="/management/activity" className="btn-secondary flex-1 text-center">View Activity Log</Link>
        <Link href="/management/analytics" className="btn-secondary flex-1 text-center">Analytics</Link>
      </div>
    </div>
  );
}
