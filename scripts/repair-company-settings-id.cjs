const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRawUnsafe('SHOW COLUMNS FROM `CompanySetting`');
  const indexes = await prisma.$queryRawUnsafe('SHOW INDEX FROM `CompanySetting`');
  const id = columns.find(column => column.Field === 'id');
  if (id?.Extra.includes('auto_increment') && indexes.some(index => index.Key_name === 'PRIMARY' && index.Column_name === 'id')) {
    console.log('CompanySetting ID is already configured correctly.');
    return;
  }
  if (!id || indexes.some(index => index.Key_name === 'PRIMARY')) throw new Error('Unexpected primary key structure; manual review required.');
  const before = await prisma.$queryRawUnsafe('SELECT * FROM `CompanySetting` ORDER BY `userId`');
  if (before.some(row => !Number.isInteger(row.id) || row.id < 1) || new Set(before.map(row => row.id)).size !== before.length) {
    throw new Error('Existing settings IDs are invalid or duplicated; no changes made.');
  }
  if (!indexes.some(index => index.Column_name === 'userId' && Number(index.Non_unique) === 0)) throw new Error('Missing unique ownership index; no changes made.');
  await prisma.$executeRawUnsafe('ALTER TABLE `CompanySetting` MODIFY COLUMN `id` INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`)');
  const after = await prisma.$queryRawUnsafe('SELECT * FROM `CompanySetting` ORDER BY `userId`');
  assert.deepEqual(after, before, 'Existing settings must remain unchanged');
  console.log(`Repaired settings ID generation; preserved all ${before.length} existing settings records.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
