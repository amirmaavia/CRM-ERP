import { requireSession } from "@/lib/auth/session";
import { UserGuide } from "@/components/help/user-guide";

export default async function HelpPage() {
  const session = await requireSession();
  return <UserGuide role={session.user.role} permissions={session.user.permissions} />;
}
