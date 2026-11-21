import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { DashboardProvider } from "@/components/providers/dashboard-provider";
import { requireSession } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return <DashboardProvider session={session}><div className="min-h-screen"><Sidebar isOwner={session.user.id === session.user.tenantId} role={session.user.role} permissions={session.user.permissions} /><div className="md:ml-64"><Header name={session.user.name} role={session.user.role} /><main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main></div></div></DashboardProvider>;
}
