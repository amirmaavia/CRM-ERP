DELETE FROM `Role` WHERE name = '' OR name IS NULL;
UPDATE `Role` SET `updatedAt` = NOW() WHERE `updatedAt` = '0000-00-00 00:00:00';
SELECT * FROM `Role`;