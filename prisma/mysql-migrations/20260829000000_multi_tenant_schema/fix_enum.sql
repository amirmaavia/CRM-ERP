ALTER TABLE `Role` MODIFY COLUMN `name` ENUM('SUPER_ADMIN','ADMIN','MANAGER','STAFF','PLATFORM_ADMIN','USER');

INSERT IGNORE INTO `Role` (name, description) VALUES ('PLATFORM_ADMIN', 'platform admin'), ('USER', 'user');

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
SELECT u.id, u.name, u.email, r.name as role 
FROM `User` u JOIN `Role` r ON u.roleId = r.id;