-- CreateTable
CREATE TABLE `DeviceSigner` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `deviceName` VARCHAR(191) NOT NULL,
    `publicKey` TEXT NOT NULL,
    `fcmToken` TEXT NULL,
    `biometricType` VARCHAR(191) NOT NULL DEFAULT 'biometric',
    `pinHash` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DeviceSigner_deviceId_key`(`deviceId`),
    INDEX `DeviceSigner_userId_idx`(`userId`),
    INDEX `DeviceSigner_deviceId_idx`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentSignatureLog` (
    `id` VARCHAR(191) NOT NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `signerId` VARCHAR(191) NOT NULL,
    `signatureProof` TEXT NOT NULL,
    `biometricType` VARCHAR(191) NOT NULL,
    `deviceInfo` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NOT NULL DEFAULT '',
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `signedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DocumentSignatureLog_documentType_documentId_idx`(`documentType`, `documentId`),
    INDEX `DocumentSignatureLog_signedAt_idx`(`signedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MobileRefreshToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MobileRefreshToken_tokenHash_key`(`tokenHash`),
    INDEX `MobileRefreshToken_userId_idx`(`userId`),
    INDEX `MobileRefreshToken_deviceId_idx`(`deviceId`),
    INDEX `MobileRefreshToken_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DeviceSigner` ADD CONSTRAINT `DeviceSigner_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentSignatureLog` ADD CONSTRAINT `DocumentSignatureLog_signerId_fkey` FOREIGN KEY (`signerId`) REFERENCES `DeviceSigner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MobileRefreshToken` ADD CONSTRAINT `MobileRefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
