-- CreateTable
CREATE TABLE `DeliverySettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'main',
    `emailEnabled` BOOLEAN NOT NULL DEFAULT false,
    `smtpHost` VARCHAR(191) NOT NULL DEFAULT '',
    `smtpPort` INTEGER NOT NULL DEFAULT 587,
    `smtpSecure` BOOLEAN NOT NULL DEFAULT false,
    `smtpUser` VARCHAR(191) NOT NULL DEFAULT '',
    `smtpPasswordEnc` VARCHAR(191) NOT NULL DEFAULT '',
    `smtpFromName` VARCHAR(191) NOT NULL DEFAULT 'Nusadoc',
    `smtpFromEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `waEnabled` BOOLEAN NOT NULL DEFAULT false,
    `waProvider` VARCHAR(191) NOT NULL DEFAULT 'fonnte',
    `waTokenEnc` VARCHAR(191) NOT NULL DEFAULT '',
    `waAdminPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `autoSendOnPublish` BOOLEAN NOT NULL DEFAULT true,
    `autoSendOnPayment` BOOLEAN NOT NULL DEFAULT true,
    `reminderDaysBeforeDue` INTEGER NOT NULL DEFAULT 3,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryLog` (
    `id` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `target` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL DEFAULT '',
    `status` VARCHAR(191) NOT NULL,
    `error` TEXT NULL,
    `relatedType` VARCHAR(191) NULL,
    `relatedId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DeliveryLog_relatedType_relatedId_idx`(`relatedType`, `relatedId`),
    INDEX `DeliveryLog_createdAt_idx`(`createdAt`),
    INDEX `DeliveryLog_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
