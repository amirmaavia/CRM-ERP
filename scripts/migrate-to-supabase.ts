import { randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const tables = [
  "Role", "Permission", "RolePermission", "User", "Company", "Lead", "Contact", "Deal", "Task", "Note", "Document",
  "Category", "Warehouse", "Product", "Supplier", "PurchaseOrder", "PurchaseOrderItem", "Invoice", "InvoiceItem", "Payment",
  "PaymentAllocation", "StockMovement", "Expense", "ActivityLog", "CompanySetting", "NotificationPreference",
];
const booleanColumns = new Set(["Product.active", "Invoice.stockOverride", "Invoice.affectsStock", "CompanySetting.lowStockEmails", "CompanySetting.emailNotifications", "NotificationPreference.emailReminders", "NotificationPreference.taskReminders", "NotificationPreference.lowStockAlerts"]);

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const source = await mysql.createConnection(required("SOURCE_DATABASE_URL"));
  const target = new pg.Client({ connectionString: required("DIRECT_URL"), ssl: { rejectUnauthorized: false } });
  await target.connect();
  try {
    await target.query("BEGIN");
    await target.query("SET session_replication_role = replica");
    const ownerLinks: Array<{ id: string; accountOwnerId: string }> = [];
    for (const table of tables) {
      const [rows] = await source.query<mysql.RowDataPacket[]>(`SELECT * FROM \`${table}\``);
      for (const raw of rows) {
        const row: Record<string, unknown> = { ...raw };
        if (table === "User") {
          delete row.passwordHash;
          if (row.accountOwnerId) ownerLinks.push({ id: String(row.id), accountOwnerId: String(row.accountOwnerId) });
          row.accountOwnerId = null;
          row.supabaseAuthId = null;
        }
        for (const column of Object.keys(row)) if (booleanColumns.has(`${table}.${column}`)) row[column] = Boolean(row[column]);
        const columns = Object.keys(row);
        if (!columns.length) continue;
        const names = columns.map(name => `"${name}"`).join(", ");
        const values = columns.map((_, index) => `$${index + 1}`).join(", ");
        await target.query(`INSERT INTO "${table}" (${names}) VALUES (${values}) ON CONFLICT DO NOTHING`, columns.map(column => row[column]));
      }
      console.info(`${table}: ${rows.length} rows copied`);
    }
    for (const link of ownerLinks) await target.query('UPDATE "User" SET "accountOwnerId" = $1 WHERE "id" = $2', [link.accountOwnerId, link.id]);
    for (const table of ["Role", "Permission", "CompanySetting"]) await target.query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX("id") FROM "${table}"), 1), true)`);
    await target.query("SET session_replication_role = origin");
    await target.query("COMMIT");

    const adminKey = process.env.SUPABASE_SECRET_KEY?.trim() || required("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const users = (await target.query<{ id: string; email: string; name: string }>('SELECT "id", "email", "name" FROM "User"')).rows;
    const authUsers = new Map<string, string>();
    for (let page = 1; ; page++) {
      const result = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (result.error) throw result.error;
      result.data.users.forEach(user => { if (user.email) authUsers.set(user.email.toLowerCase(), user.id); });
      if (result.data.users.length < 1000) break;
    }
    const adminEmail = required("SEED_ADMIN_EMAIL").toLowerCase();
    for (const user of users) {
      let authId = authUsers.get(user.email.toLowerCase());
      if (!authId) {
        const password = user.email.toLowerCase() === adminEmail ? required("SEED_ADMIN_PASSWORD") : randomBytes(36).toString("base64url");
        const created = await supabase.auth.admin.createUser({ email: user.email, password, email_confirm: true, user_metadata: { name: user.name } });
        if (created.error || !created.data.user) throw created.error ?? new Error(`Could not create auth user ${user.email}`);
        authId = created.data.user.id;
      }
      await target.query('UPDATE "User" SET "supabaseAuthId" = $1 WHERE "id" = $2', [authId, user.id]);
    }
    console.info(`Migration complete. ${users.length} application users linked to Supabase Auth.`);
  } catch (error) {
    await target.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
