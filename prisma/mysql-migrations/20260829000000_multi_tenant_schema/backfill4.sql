-- Fix remaining: Supplier, CompanySetting, Role assignments, ActivityLog enum

-- Supplier: drop FK first, then index, then add composite
ALTER TABLE `Supplier` DROP FOREIGN KEY `Supplier_companyId_fkey`;
ALTER TABLE `Supplier` DROP INDEX `Supplier_companyId_key`;
ALTER TABLE `Supplier` ADD UNIQUE INDEX `Supplier_userId_companyId_key` (`userId`, `companyId`);
ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- CompanySetting: add unique index on userId
ALTER TABLE `CompanySetting` ADD UNIQUE INDEX `CompanySetting_userId_key` (`userId`);

-- Update Role assignments
UPDATE `User` u
JOIN `Role` r ON u.roleId = r.id
SET u.roleId = (SELECT id FROM `Role` WHERE name = 'PLATFORM_ADMIN' LIMIT 1)
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER');

UPDATE `User` u
JOIN `Role` r ON u.roleId = r.id
SET u.roleId = (SELECT id FROM `Role` WHERE name = 'USER' LIMIT 1)
WHERE r.name = 'STAFF';

-- Add watermarkText
ALTER TABLE `CompanySetting` ADD COLUMN `watermarkText` VARCHAR(50) DEFAULT 'Am';

-- Update ActivityLog enum
ALTER TABLE `ActivityLog` MODIFY COLUMN `action` ENUM(
  'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'CONVERT', 'PAYMENT', 
  'STOCK_OVERRIDE', 'SIGNUP', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'SETTINGS_CHANGE'
);

-- Verify
SELECT 'Supplier' as t, COUNT(*) as total, SUM(userId IS NULL) as nulls FROM Supplier UNION ALL
SELECT 'CompanySetting', COUNT(*), SUM(userId IS NULL) FROM CompanySetting;

SELECT u.id, u.name, u.email, r.name as role 
FROM `User` u JOIN `Role` r ON u.roleId = r.id;