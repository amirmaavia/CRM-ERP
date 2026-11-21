SET FOREIGN_KEY_CHECKS = 0;
ALTER TABLE `Role` MODIFY `name` ENUM('SUPER_ADMIN','ADMIN','STAFF','PLATFORM_ADMIN','MANAGER','SALES','ACCOUNTANT','INVENTORY','USER') NULL;
SET FOREIGN_KEY_CHECKS = 1;
ALTER TABLE `User` ADD COLUMN `accountOwnerId` VARCHAR(191) NULL;
CREATE INDEX `User_accountOwnerId_status_idx` ON `User`(`accountOwnerId`, `status`);
ALTER TABLE `User` ADD CONSTRAINT `User_accountOwnerId_fkey` FOREIGN KEY (`accountOwnerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- This installation historically had one business owner. Attach existing staff
-- to that owner's workspace while preserving each user's identity for auditing.
UPDATE `User`
SET `accountOwnerId` = (
  SELECT `ownerId` FROM (
    SELECT u.`id` AS `ownerId`
    FROM `User` u
    INNER JOIN `Role` r ON r.`id` = u.`roleId`
    WHERE r.`name` = 'PLATFORM_ADMIN'
    ORDER BY u.`createdAt` ASC
    LIMIT 1
  ) AS `workspace_owner`
)
WHERE `accountOwnerId` IS NULL
  AND `roleId` IN (SELECT `id` FROM `Role` WHERE `name` <> 'PLATFORM_ADMIN');
