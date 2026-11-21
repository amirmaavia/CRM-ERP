-- Add unique constraints for Contact, Lead, Supplier

-- Contact: unique email per user
ALTER TABLE `Contact` ADD UNIQUE INDEX `Contact_userId_email_key` (`userId`, `email`);

-- Lead: unique email per user
ALTER TABLE `Lead` ADD UNIQUE INDEX `Lead_userId_email_key` (`userId`, `email`);

-- Supplier: unique email per user
ALTER TABLE `Supplier` ADD UNIQUE INDEX `Supplier_userId_email_key` (`userId`, `email`);

-- Supplier: unique companyId per user (already done but verify)
-- ALTER TABLE `Supplier` ADD UNIQUE INDEX `Supplier_userId_companyId_key` (`userId`, `companyId`);

-- Verify
SHOW INDEX FROM Contact WHERE Key_name = 'Contact_userId_email_key';
SHOW INDEX FROM Lead WHERE Key_name = 'Lead_userId_email_key';
SHOW INDEX FROM Supplier WHERE Key_name = 'Supplier_userId_email_key';