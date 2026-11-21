import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { RoleName } from "@prisma/client";
import { canAssignRole } from "../lib/auth/permissions";
import { POST as signup } from "../app/api/auth/signup/route";

test("only platform administrators can assign roles", () => {
  for (const actor of Object.values(RoleName)) for (const target of Object.values(RoleName)) {
    assert.equal(canAssignRole(actor, target), actor === RoleName.PLATFORM_ADMIN);
  }
});

test("public registration stays disabled", async () => {
  assert.equal((await signup()).status, 403);
});

test("application schema targets PostgreSQL and delegates passwords to Supabase", async () => {
  const schema = await readFile("prisma/schema.prisma", "utf8");
  assert.match(schema, /provider\s*=\s*"postgresql"/);
  assert.match(schema, /supabaseAuthId\s+String\?/);
  assert.doesNotMatch(schema, /passwordHash|PasswordResetToken/);
});

test("all public application tables have RLS hardening", async () => {
  const sql = await readFile("prisma/supabase-rls.sql", "utf8");
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  for (const table of ["User", "Company", "Invoice", "Payment", "ActivityLog"]) assert.ok(sql.includes(`'${table}'`));
});

test("business access cannot grant platform permissions", async () => {
  const { permissionsForAccess, ALL_BUSINESS_KEYS, effectiveBusinessPermissions } = await import("../lib/auth/business-access");
  const all = permissionsForAccess(ALL_BUSINESS_KEYS);
  assert.ok(all.includes("business.users.manage"));
  assert.ok(!all.includes("users.manage"));
  assert.deepEqual(effectiveBusinessPermissions(["finance.write"], [], false, false), []);
});
