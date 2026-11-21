import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardProvider } from "@/components/providers/dashboard-provider";
import { requireAdmin } from "@/lib/auth/session";

export default async function ManagementLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return <DashboardProvider session={session}><div className="min-h-screen"><Sidebar isOwner={session.user.id === session.user.tenantId} role={session.user.role} permissions={session.user.permissions} /><div className="md:ml-64"><Header name={session.user.name} role={session.user.role} /><main className="p-5 md:p-7">{children}</main></div></div></DashboardProvider>;
}
