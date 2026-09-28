-- AlterTable
ALTER TABLE `Invoice` ADD COLUMN `snapshot` JSON NULL;

-- AlterTable
ALTER TABLE `Quotation` ADD COLUMN `snapshot` JSON NULL;

-- AlterTable
ALTER TABLE `Receipt` ADD COLUMN `snapshot` JSON NULL;

-- CreateTable
CREATE TABLE `DocumentCounter` (
    `key` VARCHAR(191) NOT NULL,
    `value` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Invoice_quotationId_terminIndex_key` ON `Invoice`(`quotationId`, `terminIndex`);

