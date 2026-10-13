-- ══════════════════════════════════════════════════════════════
-- SaaS Multi-Tenant: Organization, plans (trial/lite/bulanan/hakguna),
-- organizationId di semua model domain, counter per-org, composite unique.
-- Semua data existing dipindahkan ke workspace default "org_demo".
-- ══════════════════════════════════════════════════════════════

-- CreateTable Organization
CREATE TABLE `Organization` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `plan` VARCHAR(191) NOT NULL DEFAULT 'trial',
    `trialEndsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Organization_plan_idx`(`plan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Workspace default untuk seluruh data demo yang sudah ada.
-- Plan 'hakguna' (lifetime) agar tidak terkunci kuota saat development.
INSERT INTO `Organization` (`id`, `name`, `plan`) VALUES ('org_demo', 'Demo Workspace', 'hakguna');

-- AlterTable: tambahkan kolom organizationId (nullable dulu untuk backfill)
ALTER TABLE `User` ADD COLUMN `organizationId` VARCHAR(191) NULL;
ALTER TABLE `Client` ADD COLUMN `organizationId` VARCHAR(191) NULL;
ALTER TABLE `Quotation` ADD COLUMN `organizationId` VARCHAR(191) NULL;
ALTER TABLE `Invoice` ADD COLUMN `organizationId` VARCHAR(191) NULL;
ALTER TABLE `Payment` ADD COLUMN `organizationId` VARCHAR(191) NULL;
ALTER TABLE `Receipt` ADD COLUMN `organizationId` VARCHAR(191) NULL;
ALTER TABLE `ItemTemplate` ADD COLUMN `organizationId` VARCHAR(191) NULL;
ALTER TABLE `CompanySettings` ADD COLUMN `organizationId` VARCHAR(191) NULL;
ALTER TABLE `DeliverySettings` ADD COLUMN `organizationId` VARCHAR(191) NULL;
ALTER TABLE `Subscription` ADD COLUMN `organizationId` VARCHAR(191) NULL;
ALTER TABLE `Subscription` ADD COLUMN `userId` VARCHAR(191) NULL;

-- Backfill: semua data existing milik workspace demo
UPDATE `User` SET `organizationId` = 'org_demo' WHERE `organizationId` IS NULL;
UPDATE `Client` SET `organizationId` = 'org_demo' WHERE `organizationId` IS NULL;
UPDATE `Quotation` SET `organizationId` = 'org_demo' WHERE `organizationId` IS NULL;
UPDATE `Invoice` SET `organizationId` = 'org_demo' WHERE `organizationId` IS NULL;
UPDATE `Payment` SET `organizationId` = 'org_demo' WHERE `organizationId` IS NULL;
UPDATE `Receipt` SET `organizationId` = 'org_demo' WHERE `organizationId` IS NULL;
UPDATE `ItemTemplate` SET `organizationId` = 'org_demo' WHERE `organizationId` IS NULL;
UPDATE `CompanySettings` SET `organizationId` = 'org_demo' WHERE `organizationId` IS NULL;
UPDATE `DeliverySettings` SET `organizationId` = 'org_demo' WHERE `organizationId` IS NULL;

-- Kunci NOT NULL setelah backfill (semua domain model wajib ber-org)
ALTER TABLE `User` MODIFY COLUMN `organizationId` VARCHAR(191) NOT NULL;
ALTER TABLE `Client` MODIFY COLUMN `organizationId` VARCHAR(191) NOT NULL;
ALTER TABLE `Quotation` MODIFY COLUMN `organizationId` VARCHAR(191) NOT NULL;
ALTER TABLE `Invoice` MODIFY COLUMN `organizationId` VARCHAR(191) NOT NULL;
ALTER TABLE `Payment` MODIFY COLUMN `organizationId` VARCHAR(191) NOT NULL;
ALTER TABLE `Receipt` MODIFY COLUMN `organizationId` VARCHAR(191) NOT NULL;
ALTER TABLE `ItemTemplate` MODIFY COLUMN `organizationId` VARCHAR(191) NOT NULL;
ALTER TABLE `CompanySettings` MODIFY COLUMN `organizationId` VARCHAR(191) NOT NULL;
ALTER TABLE `DeliverySettings` MODIFY COLUMN `organizationId` VARCHAR(191) NOT NULL;

-- Index + Foreign Key
CREATE INDEX `User_organizationId_idx` ON `User`(`organizationId`);
ALTER TABLE `User` ADD CONSTRAINT `User_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX `Client_organizationId_idx` ON `Client`(`organizationId`);
ALTER TABLE `Client` ADD CONSTRAINT `Client_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX `Quotation_organizationId_idx` ON `Quotation`(`organizationId`);
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX `Invoice_organizationId_idx` ON `Invoice`(`organizationId`);
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX `Payment_organizationId_idx` ON `Payment`(`organizationId`);
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX `Receipt_organizationId_idx` ON `Receipt`(`organizationId`);
ALTER TABLE `Receipt` ADD CONSTRAINT `Receipt_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX `ItemTemplate_organizationId_idx` ON `ItemTemplate`(`organizationId`);
ALTER TABLE `ItemTemplate` ADD CONSTRAINT `ItemTemplate_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX `CompanySettings_organizationId_key` ON `CompanySettings`(`organizationId`);
ALTER TABLE `CompanySettings` ADD CONSTRAINT `CompanySettings_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX `DeliverySettings_organizationId_key` ON `DeliverySettings`(`organizationId`);
ALTER TABLE `DeliverySettings` ADD CONSTRAINT `DeliverySettings_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX `Subscription_organizationId_idx` ON `Subscription`(`organizationId`);
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Client.code: dari unique global → composite per-organisasi
ALTER TABLE `Client` DROP INDEX `Client_code_key`;
ALTER TABLE `Client` ADD UNIQUE INDEX `Client_organizationId_code_key`(`organizationId`, `code`);

-- DocumentCounter: key lama diberi prefix workspace demo agar kontinuitas
-- nomor dokumen demo tetap berlanjut (tidak reset ke 001).
UPDATE `DocumentCounter` SET `key` = CONCAT('org_demo:', `key`)
WHERE `key` NOT LIKE '%:%' AND (`key` LIKE 'QUO-%' OR `key` LIKE 'INV-%' OR `key` LIKE 'KWT-%');
