const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const rollback = new Error('EXPECTED_TEST_ROLLBACK');
async function main() {
  const emails = [];
  try {
    await prisma.$transaction(async tx => {
      const role = await tx.role.findUniqueOrThrow({ where: { name: 'USER' } });
      const settingsIds = [];
      let ownerId;
      for (const workspace of ['INDEPENDENT', 'INDEPENDENT', 'SHARED']) {
        const email = `creation-test-${randomUUID()}@example.invalid`;
        emails.push(email);
        const user = await tx.user.create({
          data: { name: 'Rollback creation test', email, supabaseAuthId: randomUUID(), roleId: role.id,
            accountOwnerId: workspace === 'SHARED' ? ownerId : null,
            notificationPreference: { create: {} },
            ...(workspace === 'INDEPENDENT' ? { companySettings: { create: { companyName: 'Rollback test business' } } } : {}),
          },
          include: { companySettings: true, notificationPreference: true },
        });
        assert.ok(user.id);
        assert.ok(user.notificationPreference.id);
        if (workspace === 'INDEPENDENT') {
          assert.ok(user.companySettings[0].id > 0);
          settingsIds.push(user.companySettings[0].id);
          ownerId = user.id;
        } else assert.equal(user.accountOwnerId, ownerId);
        await tx.activityLog.create({ data: { userId: user.id, action: 'CREATE', entityType: 'User', entityId: user.id, description: 'Rollback verification' } });
      }
      assert.equal(new Set(settingsIds).size, 2);
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  assert.equal(await prisma.user.count({ where: { email: { in: emails } } }), 0);
  console.log('PASS: two isolated users and one shared user created with settings/preferences/audit; all test records rolled back.');
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
