ALTER TABLE `DeliveryLog` ADD COLUMN `organizationId` VARCHAR(191) NOT NULL DEFAULT 'org_demo';
CREATE INDEX `DeliveryLog_organizationId_idx` ON `DeliveryLog`(`organizationId`);
