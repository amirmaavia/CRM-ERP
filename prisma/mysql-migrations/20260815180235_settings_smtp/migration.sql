-- AlterTable
ALTER TABLE `companysetting` ADD COLUMN `emailNotifications` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `smtpFrom` VARCHAR(191) NULL,
    ADD COLUMN `smtpHost` VARCHAR(191) NULL,
    ADD COLUMN `smtpPassword` VARCHAR(500) NULL,
    ADD COLUMN `smtpPort` INTEGER NULL DEFAULT 587,
    ADD COLUMN `smtpUser` VARCHAR(191) NULL;
