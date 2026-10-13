import crypto from "node:crypto";

/**
 * Enkripsi kredensial delivery (SMTP password / WA token) dengan AES-256-GCM.
 * Key diambil dari env `DELIVERY_ENC_KEY` (64 hex chars) — jika belum disetel,
 * key derivatif lokal dihitung dari DATABASE_URL host (development-only fallback).
 * Format tersimpan: v1:<iv-hex>:<tag-hex>:<ciphertext-hex>
 */

function getEncryptionKey(): Buffer {
  const raw = process.env.DELIVERY_ENC_KEY || "";
  if (raw.length >= 64) {
    return Buffer.from(raw.slice(0, 64), "hex");
  }
  // Fallback development: derivasi deterministik (bukan untuk production).
  const seed = raw || process.env.DATABASE_URL || "nusadoc-local-dev";
  return crypto.createHash("sha256").update(seed).digest();
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(stored: string): string {
  if (!stored) return "";
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") return "";
  try {
    const iv = Buffer.from(parts[1], "hex");
    const tag = Buffer.from(parts[2], "hex");
    const data = Buffer.from(parts[3], "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

/** Masking untuk tampilan UI: hanya menandai apakah kredensial sudah diset. */
export function hasSecret(stored: string): boolean {
  return Boolean(stored) && decryptSecret(stored) !== "";
}
