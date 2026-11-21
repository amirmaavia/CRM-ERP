-- Fixed backfill and constraints (run after partial migration)

-- Backfill userId with admin user ID
SELECT u.id INTO @admin_user_id FROM `User` u
JOIN `Role` r ON u.roleId = r.id
WHERE r.name = 'SUPER_ADMIN'
LIMIT 1;

SELECT IFNULL(@admin_user_id, (SELECT id FROM `User` LIMIT 1)) INTO @admin_user_id;

SELECT @admin_user_id as admin_id;

UPDATE `Category` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `Company` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `Contact` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `Deal` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `Document` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `Expense` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `Invoice` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `Lead` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `Note` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `Payment` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `Product` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `PurchaseOrder` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `StockMovement` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `Supplier` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `Task` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `Warehouse` SET `userId` = @admin_user_id WHERE `userId` IS NULL;
UPDATE `CompanySetting` SET `userId` = @admin_user_id WHERE `userId` IS NULL;

-- Make userId NOT NULL
ALTER TABLE `Category` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `Company` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `Contact` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `Deal` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `Document` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `Expense` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `Invoice` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `Lead` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `Note` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `Payment` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `Product` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `PurchaseOrder` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `StockMovement` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `Supplier` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `Task` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `Warehouse` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `CompanySetting` MODIFY `userId` VARCHAR(191) NOT NULL;

-- Add foreign keys (skip if exist)
ALTER TABLE `Category` ADD CONSTRAINT `Category_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `Company` ADD CONSTRAINT `Company_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `Contact` ADD CONSTRAINT `Contact_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `Deal` ADD CONSTRAINT `Deal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `Document` ADD CONSTRAINT `Document_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `Note` ADD CONSTRAINT `Note_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `Product` ADD CONSTRAINT `Product_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `Task` ADD CONSTRAINT `Task_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `Warehouse` ADD CONSTRAINT `Warehouse_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;
ALTER TABLE `CompanySetting` ADD CONSTRAINT `CompanySetting_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE;

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

ALTER TABLE `Supplier` DROP INDEX `Supplier_companyId_key`;
ALTER TABLE `Supplier` ADD UNIQUE INDEX `Supplier_userId_companyId_key` (`userId`, `companyId`);

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

-- Verify backfill
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