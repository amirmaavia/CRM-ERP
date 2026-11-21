import { PrismaClient, RoleName } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const name = (process.env.ADMIN_NAME || process.env.SEED_ADMIN_NAME || "System Administrator").trim();
  const email = (process.env.ADMIN_EMAIL || required("SEED_ADMIN_EMAIL")).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || required("SEED_ADMIN_PASSWORD");
  const adminKey = process.env.SUPABASE_SECRET_KEY?.trim() || required("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let authId: string | undefined;
  for (let page = 1; !authId; page++) {
    const result = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw result.error;
    authId = result.data.users.find(user => user.email?.toLowerCase() === email)?.id;
    if (result.data.users.length < 1000) break;
  }
  const existingAppUser = await prisma.user.findUnique({ where: { email }, select: { id: true, supabaseAuthId: true, status: true, role: { select: { name: true } } } });
  if (authId && existingAppUser?.supabaseAuthId === authId && existingAppUser.status === "ACTIVE" && existingAppUser.role.name === RoleName.PLATFORM_ADMIN) {
    const login = await supabase.auth.signInWithPassword({ email, password });
    if (login.error) throw new Error("The main administrator exists, but SEED_ADMIN_PASSWORD does not match its Supabase Auth password.");
    await supabase.auth.signOut();
    console.info(`Main administrator ${email} already exists and is correctly linked.`);
    return;
  }
  if (authId || existingAppUser) throw new Error(`An incomplete or conflicting account exists; no changes were made. Auth=${Boolean(authId)}, ERP=${Boolean(existingAppUser)}`);

  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (created.error || !created.data.user) throw created.error ?? new Error("Supabase Auth user creation failed");
  authId = created.data.user.id;

  try {
    const permissionDescriptions: Record<string, string> = {
      "users.manage": "Create, update, and deactivate staff accounts",
      "crm.read": "View CRM records", "crm.write": "Create and update CRM records",
      "inventory.read": "View products and stock", "inventory.write": "Manage products and stock",
      "finance.read": "View invoices, payments, and reports", "finance.write": "Create financial transactions",
      "finance.amend": "Edit or void posted financial transactions", "settings.manage": "Manage company settings",
    };
    const role = await prisma.role.upsert({ where: { name: RoleName.PLATFORM_ADMIN }, update: {}, create: { name: RoleName.PLATFORM_ADMIN, description: "platform administrator" } });
    for (const [key, description] of Object.entries(permissionDescriptions)) {
      const permission = await prisma.permission.upsert({ where: { key }, update: { description }, create: { key, description } });
      await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { roleId: role.id, permissionId: permission.id } });
    }
    const user = await prisma.user.create({
      data: {
        name, email, supabaseAuthId: authId, roleId: role.id,
        companySettings: { create: { companyName: `${name}'s Business` } },
        notificationPreference: { create: {} },
      },
      select: { id: true, email: true, status: true, role: { select: { name: true } } },
    });
    console.info(`Created or updated ${user.role.name} account ${user.email} (${user.status}).`);
  } catch (error) {
    if (authId) await supabase.auth.admin.deleteUser(authId).catch(() => undefined);
    throw error;
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
