SELECT u.id, u.name, u.email, r.name as role FROM `User` u JOIN `Role` r ON u.roleId = r.id;
SELECT COUNT(*) as categories FROM `Category`;
SELECT COUNT(*) as products FROM `Product`;
SELECT COUNT(*) as contacts FROM `Contact`;
SELECT COUNT(*) as leads FROM `Lead`;
SELECT COUNT(*) as invoices FROM `Invoice`;
SELECT COUNT(*) as companies FROM `Company`;