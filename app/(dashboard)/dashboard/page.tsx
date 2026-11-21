import { requireSession } from "@/lib/auth/session";
import { DashboardView } from "@/components/dashboard/dashboard-view";

const views: Record<string, { title: string; description: string }> = {
  SUPER_ADMIN: { title: "Executive Overview", description: "Full system administration and company-wide visibility." },
  ADMIN: { title: "Administration Dashboard", description: "Operations, team access, and business performance." },
  MANAGER: { title: "Management Dashboard", description: "Team pipeline, stock, receivables, and performance." },
  STAFF: { title: "My Workspace", description: "Assigned leads, tasks, customers, and daily activity." },
};
export default async function DashboardPage() {
  const session = await requireSession(); const view = views[session.user.role];
  return <DashboardView heading={view?.title} description={view?.description} />;
}
