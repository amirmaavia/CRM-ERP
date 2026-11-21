import { UserStatus } from "@prisma/client";
import { effectiveBusinessPermissions } from "@/lib/auth/business-access";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppSession } from "@/types/auth";

export async function getAppSession(): Promise<AppSession | null> {
  const { data: { user: authUser }, error } = await createSupabaseServerClient().auth.getUser();
  if (error || !authUser) return null;
  const account = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    include: { role: { include: { permissions: { include: { permission: true } } } }, accountOwner: { select: { status: true } } },
  });
  if (!account || account.status !== UserStatus.ACTIVE || (account.accountOwner !== null && account.accountOwner.status !== UserStatus.ACTIVE)) return null;
  return { user: {
    id: account.id, tenantId: account.accountOwnerId ?? account.id, name: account.name, email: account.email, image: account.image, role: account.role.name,
    permissions: effectiveBusinessPermissions(account.role.permissions.map(({ permission }) => permission.key), account.businessAccess, account.accountOwnerId === null, account.role.name === "PLATFORM_ADMIN"),
  } };
}
