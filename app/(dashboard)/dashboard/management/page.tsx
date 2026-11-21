import { redirect } from "next/navigation";
import { requireBusinessOwner } from "@/lib/auth/business-owner";
import { BusinessManagement } from "@/components/management/business-management";
export default async function Page() {
  const auth = await requireBusinessOwner();
  if (auth.error) redirect("/unauthorized");
  return <BusinessManagement actorId={auth.session.user.id} permissions={auth.session.user.permissions} />;
}
