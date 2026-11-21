-- One company may have one vendor profile while retaining multiple customer contacts.
ALTER TABLE `Supplier`
  ADD COLUMN `companyId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `Supplier_companyId_key` ON `Supplier`(`companyId`);

ALTER TABLE `Supplier`
  ADD CONSTRAINT `Supplier_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Purchases now explicitly distinguish cash from credit and track settlement.
ALTER TABLE `PurchaseOrder`
  ADD COLUMN `type` ENUM('CASH_PURCHASE', 'CREDIT_PURCHASE') NOT NULL DEFAULT 'CREDIT_PURCHASE',
  ADD COLUMN `paidAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0;
