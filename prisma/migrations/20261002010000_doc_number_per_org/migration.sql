-- Nomor dokumen unik PER ORGANISASI (dua perusahaan boleh sama-sama punya 001).
-- Verifikasi publik tetap global-unique via token QR.
ALTER TABLE `Quotation` DROP INDEX `Quotation_number_key`;
ALTER TABLE `Quotation` ADD UNIQUE INDEX `Quotation_organizationId_number_key`(`organizationId`, `number`);

ALTER TABLE `Invoice` DROP INDEX `Invoice_number_key`;
ALTER TABLE `Invoice` ADD UNIQUE INDEX `Invoice_organizationId_number_key`(`organizationId`, `number`);

ALTER TABLE `Receipt` DROP INDEX `Receipt_number_key`;
ALTER TABLE `Receipt` ADD UNIQUE INDEX `Receipt_organizationId_number_key`(`organizationId`, `number`);
