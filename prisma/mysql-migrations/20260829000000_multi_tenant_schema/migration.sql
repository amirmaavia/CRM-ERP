-- Multi-tenant schema migration
-- This migration adds userId to all business entities and backfills with admin user

-- Get admin user ID (first user with SUPER_ADMIN role)
SELECT u.id INTO @admin_user_id FROM `User` u
JOIN `Role` r ON u.roleId = r.id
WHERE r.name = 'SUPER_ADMIN'
LIMIT 1;

-- If no admin user found, use the first user
SELECT IFNULL(@admin_user_id, (SELECT id FROM `User` LIMIT 1)) INTO @admin_user_id;

-- ============================================================
-- 1. Add nullable userId columns to all business tables
-- ============================================================

ALTER TABLE `Category` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Company` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Contact` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Deal` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Document` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Expense` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Invoice` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Lead` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Note` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Payment` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `PurchaseOrder` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `StockMovement` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Supplier` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Task` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Warehouse` ADD COLUMN `userId` VARCHAR(191) NULL;

-- CompanySetting: change from single row to per-user
ALTER TABLE `CompanySetting` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `CompanySetting` DROP PRIMARY KEY;
ALTER TABLE `CompanySetting` ADD COLUMN `id` INT AUTO_INCREMENT PRIMARY KEY FIRST;

-- ============================================================
-- 2. Backfill all userId columns with admin user ID
-- ============================================================

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

-- ============================================================
-- 3. Make userId NOT NULL and add foreign keys
-- ============================================================

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

-- Add foreign keys
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

-- ============================================================
-- 4. Add indexes on userId for query performance
-- ============================================================

CREATE INDEX `Category_userId_idx` ON `Category`(`userId`);
CREATE INDEX `Company_userId_idx` ON `Company`(`userId`);
CREATE INDEX `Contact_userId_idx` ON `Contact`(`userId`);
CREATE INDEX `Deal_userId_idx` ON `Deal`(`userId`);
CREATE INDEX `Document_userId_idx` ON `Document`(`userId`);
CREATE INDEX `Expense_userId_idx` ON `Expense`(`userId`);
CREATE INDEX `Invoice_userId_idx` ON `Invoice`(`userId`);
CREATE INDEX `Lead_userId_idx` ON `Lead`(`userId`);
CREATE INDEX `Note_userId_idx` ON `Note`(`userId`);
CREATE INDEX `Payment_userId_idx` ON `Payment`(`userId`);
CREATE INDEX `Product_userId_idx` ON `Product`(`userId`);
CREATE INDEX `PurchaseOrder_userId_idx` ON `PurchaseOrder`(`userId`);
CREATE INDEX `StockMovement_userId_idx` ON `StockMovement`(`userId`);
CREATE INDEX `Supplier_userId_idx` ON `Supplier`(`userId`);
CREATE INDEX `Task_userId_idx` ON `Task`(`userId`);
CREATE INDEX `Warehouse_userId_idx` ON `Warehouse`(`userId`);

-- Composite indexes for common queries
CREATE INDEX `Category_userId_name_idx` ON `Category`(`userId`, `name`);
CREATE INDEX `Company_userId_name_idx` ON `Company`(`userId`, `name`);
CREATE INDEX `Contact_userId_companyId_status_idx` ON `Contact`(`userId`, `companyId`, `status`);
CREATE INDEX `Contact_userId_email_idx` ON `Contact`(`userId`, `email`);
CREATE INDEX `Contact_userId_firstName_lastName_idx` ON `Contact`(`userId`, `firstName`, `lastName`);
CREATE INDEX `Deal_userId_stage_position_idx` ON `Deal`(`userId`, `stage`, `position`);
CREATE INDEX `Deal_userId_ownerId_expectedCloseDate_idx` ON `Deal`(`userId`, `ownerId`, `expectedCloseDate`);
CREATE INDEX `Deal_userId_contactId_idx` ON `Deal`(`userId`, `contactId`);
CREATE INDEX `Invoice_userId_contactId_status_idx` ON `Invoice`(`userId`, `contactId`, `status`);
CREATE INDEX `Invoice_userId_issueDate_idx` ON `Invoice`(`userId`, `issueDate`);
CREATE INDEX `Invoice_userId_dueDate_status_idx` ON `Invoice`(`userId`, `dueDate`, `status`);
CREATE INDEX `Lead_userId_status_assignedToId_idx` ON `Lead`(`userId`, `status`, `assignedToId`);
CREATE INDEX `Lead_userId_companyId_idx` ON `Lead`(`userId`, `companyId`);
CREATE INDEX `Lead_userId_email_idx` ON `Lead`(`userId`, `email`);
CREATE INDEX `Note_userId_leadId_createdAt_idx` ON `Note`(`userId`, `leadId`, `createdAt`);
CREATE INDEX `Note_userId_contactId_createdAt_idx` ON `Note`(`userId`, `contactId`, `createdAt`);
CREATE INDEX `Note_userId_dealId_createdAt_idx` ON `Note`(`userId`, `dealId`, `createdAt`);
CREATE INDEX `Payment_userId_contactId_paymentDate_idx` ON `Payment`(`userId`, `contactId`, `paymentDate`);
CREATE INDEX `Payment_userId_supplierId_paymentDate_idx` ON `Payment`(`userId`, `supplierId`, `paymentDate`);
CREATE INDEX `Payment_userId_paymentDate_direction_idx` ON `Payment`(`userId`, `paymentDate`, `direction`);
CREATE INDEX `Product_userId_categoryId_active_idx` ON `Product`(`userId`, `categoryId`, `active`);
CREATE INDEX `Product_userId_name_idx` ON `Product`(`userId`, `name`);
CREATE INDEX `Product_userId_currentQuantity_minimumStock_idx` ON `Product`(`userId`, `currentQuantity`, `minimumStock`);
CREATE INDEX `PurchaseOrder_userId_supplierId_status_idx` ON `PurchaseOrder`(`userId`, `supplierId`, `status`);
CREATE INDEX `PurchaseOrder_userId_orderDate_idx` ON `PurchaseOrder`(`userId`, `orderDate`);
CREATE INDEX `StockMovement_userId_productId_occurredAt_idx` ON `StockMovement`(`userId`, `productId`, `occurredAt`);
CREATE INDEX `StockMovement_userId_warehouseId_occurredAt_idx` ON `StockMovement`(`userId`, `warehouseId`, `occurredAt`);
CREATE INDEX `StockMovement_userId_invoiceId_idx` ON `StockMovement`(`userId`, `invoiceId`);
CREATE INDEX `StockMovement_userId_purchaseOrderId_idx` ON `StockMovement`(`userId`, `purchaseOrderId`);
CREATE INDEX `Supplier_userId_name_idx` ON `Supplier`(`userId`, `name`);
CREATE INDEX `Supplier_userId_email_idx` ON `Supplier`(`userId`, `email`);
CREATE INDEX `Task_userId_assignedToId_status_dueAt_idx` ON `Task`(`userId`, `assignedToId`, `status`, `dueAt`);
CREATE INDEX `Task_userId_dealId_idx` ON `Task`(`userId`, `dealId`);
CREATE INDEX `Warehouse_userId_name_idx` ON `Warehouse`(`userId`, `name`);
CREATE INDEX `Expense_userId_expenseDate_category_idx` ON `Expense`(`userId`, `expenseDate`, `category`);

-- ============================================================
-- 5. Update unique constraints to be composite with userId
-- ============================================================

-- Category: unique per user
ALTER TABLE `Category` DROP INDEX `name`;
ALTER TABLE `Category` ADD UNIQUE INDEX `Category_userId_name_key` (`userId`, `name`);

-- Warehouse: unique per user
ALTER TABLE `Warehouse` DROP INDEX `name`;
ALTER TABLE `Warehouse` ADD UNIQUE INDEX `Warehouse_userId_name_key` (`userId`, `name`);

-- Product: unique SKU per user
ALTER TABLE `Product` DROP INDEX `sku`;
ALTER TABLE `Product` ADD UNIQUE INDEX `Product_userId_sku_key` (`userId`, `sku`);

-- Invoice: unique number per user
ALTER TABLE `Invoice` DROP INDEX `number`;
ALTER TABLE `Invoice` ADD UNIQUE INDEX `Invoice_userId_number_key` (`userId`, `number`);

-- Payment: unique number per user
ALTER TABLE `Payment` DROP INDEX `number`;
ALTER TABLE `Payment` ADD UNIQUE INDEX `Payment_userId_number_key` (`userId`, `number`);

-- PurchaseOrder: unique number per user
ALTER TABLE `PurchaseOrder` DROP INDEX `number`;
ALTER TABLE `PurchaseOrder` ADD UNIQUE INDEX `PurchaseOrder_userId_number_key` (`userId`, `number`);

-- CompanySetting: unique per user
ALTER TABLE `CompanySetting` ADD UNIQUE INDEX `CompanySetting_userId_key` (`userId`);

-- Supplier: unique companyId per user (if companyId exists)
ALTER TABLE `Supplier` DROP INDEX `companyId`;
ALTER TABLE `Supplier` ADD UNIQUE INDEX `Supplier_userId_companyId_key` (`userId`, `companyId`);

-- ============================================================
-- 6. Update Role enum: rename SUPER_ADMIN/ADMIN/MANAGER/STAFF to PLATFORM_ADMIN/USER
-- ============================================================

-- First, update existing users to new roles
UPDATE `User` u
JOIN `Role` r ON u.roleId = r.id
SET u.roleId = (SELECT id FROM `Role` WHERE name = 'PLATFORM_ADMIN' LIMIT 1)
WHERE r.name IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER');

UPDATE `User` u
JOIN `Role` r ON u.roleId = r.id
SET u.roleId = (SELECT id FROM `Role` WHERE name = 'USER' LIMIT 1)
WHERE r.name = 'STAFF';

-- ============================================================
-- 7. Add watermarkText column to CompanySetting
-- ============================================================

ALTER TABLE `CompanySetting` ADD COLUMN `watermarkText` VARCHAR(50) DEFAULT 'Am';

-- ============================================================
-- 8. Add new ActivityAction enum values
-- ============================================================

-- MySQL enum update - add new values
ALTER TABLE `ActivityLog` MODIFY COLUMN `action` ENUM(
  'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'CONVERT', 'PAYMENT', 
  'STOCK_OVERRIDE', 'SIGNUP', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'SETTINGS_CHANGE'
);