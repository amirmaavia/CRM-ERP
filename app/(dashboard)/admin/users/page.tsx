import { RoleName } from "@prisma/client";
import { UsersManager } from "@/components/admin/users-manager";
import { requireAdmin } from "@/lib/auth/session";

export default async function UsersPage() {
  const session = await requireAdmin();
  return <UsersManager actorId={session.user.id} actorRole={session.user.role as RoleName} />;
}
