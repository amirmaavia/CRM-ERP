-- Run only the remaining steps that failed

-- Update unique constraints (use correct index names)
ALTER TABLE `Category` DROP INDEX `Category_name_key`;
ALTER TABLE `Category` ADD UNIQUE INDEX `Category_userId_name_key` (`userId`, `name`);

ALTER TABLE `Warehouse` DROP INDEX `Warehouse_name_key`;
ALTER TABLE `Warehouse` ADD UNIQUE INDEX `Warehouse_userId_name_key` (`userId`, `name`);

ALTER TABLE `Product` DROP INDEX `Product_sku_key`;
ALTER TABLE `Product` ADD UNIQUE INDEX `Product_userId_sku_key` (`userId`, `sku`);

ALTER TABLE `Invoice` DROP INDEX `Invoice_number_key`;
ALTER TABLE `Invoice` ADD UNIQUE INDEX `Invoice_userId_number_key` (`userId`, `number`);

ALTER TABLE `Payment` DROP INDEX `Payment_number_key`;
ALTER TABLE `Payment` ADD UNIQUE INDEX `Payment_userId_number_key` (`userId`, `number`);

ALTER TABLE `PurchaseOrder` DROP INDEX `PurchaseOrder_number_key`;
ALTER TABLE `PurchaseOrder` ADD UNIQUE INDEX `PurchaseOrder_userId_number_key` (`userId`, `number`);

ALTER TABLE `CompanySetting` ADD UNIQUE INDEX `CompanySetting_userId_key` (`userId`);

-- Supplier: drop FK first, then index, then add composite
ALTER TABLE `Supplier` DROP FOREIGN KEY `Supplier_companyId_fkey`;
ALTER TABLE `Supplier` DROP INDEX `Supplier_companyId_key`;
ALTER TABLE `Supplier` ADD UNIQUE INDEX `Supplier_userId_companyId_key` (`userId`, `companyId`);
ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
SELECT 'Category' as t, COUNT(*) as total, SUM(userId IS NULL) as nulls FROM Category UNION ALL
SELECT 'Company', COUNT(*), SUM(userId IS NULL) FROM Company UNION ALL
SELECT 'Contact', COUNT(*), SUM(userId IS NULL) FROM Contact UNION ALL
SELECT 'Deal', COUNT(*), SUM(userId IS NULL) FROM Deal UNION ALL
SELECT 'Document', COUNT(*), SUM(userId IS NULL) FROM Document UNION ALL
SELECT 'Expense', COUNT(*), SUM(userId IS NULL) FROM Expense UNION ALL
SELECT 'Invoice', COUNT(*), SUM(userId IS NULL) FROM Invoice UNION ALL
SELECT 'Lead', COUNT(*), SUM(userId IS NULL) FROM Lead UNION ALL
SELECT 'Note', COUNT(*), SUM(userId IS NULL) FROM Note UNION ALL
SELECT 'Payment', COUNT(*), SUM(userId IS NULL) FROM Payment UNION ALL
SELECT 'Product', COUNT(*), SUM(userId IS NULL) FROM Product UNION ALL
SELECT 'PurchaseOrder', COUNT(*), SUM(userId IS NULL) FROM PurchaseOrder UNION ALL
SELECT 'StockMovement', COUNT(*), SUM(userId IS NULL) FROM StockMovement UNION ALL
SELECT 'Supplier', COUNT(*), SUM(userId IS NULL) FROM Supplier UNION ALL
SELECT 'Task', COUNT(*), SUM(userId IS NULL) FROM Task UNION ALL
SELECT 'Warehouse', COUNT(*), SUM(userId IS NULL) FROM Warehouse;