import crypto from "node:crypto";
import { verifyPassword } from "@/lib/server/password";

/**
 * Service Verifikasi TTE Biometrik & Kriptografi Mobile.
 * Menguji apakah signature digital benar-benar dihasilkan oleh kunci privat
 * di dalam Secure Enclave (Apple) / Android Keystore hardware smartphone.
 */

/**
 * Konversi Public Key mentah (Base64 SPKI DER atau raw EC) menjadi format PEM yang dimengerti Node.js
 */
export function formatPublicKeyPem(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (trimmed.includes("-----BEGIN PUBLIC KEY-----")) {
    return trimmed;
  }
  // Bungkus base64 string dengan header standard SPKI PEM
  const formatted = trimmed.match(/.{1,64}/g)?.join("\n") || trimmed;
  return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
}

/**
 * Buat challenge string kanonik yang harus ditandatangani oleh ponsel
 */
export function createSignatureChallenge(documentId: string, documentHash: string, timestamp: number): string {
  return `NUSADOC-TTE:${documentId}:${documentHash}:${timestamp}`;
}

/**
 * Verifikasi signature ECDSA P-256 (prime256v1 / secp256r1)
 */
export function verifyBiometricSignature(params: {
  publicKey: string;
  challenge: string;
  signatureBase64: string;
}): boolean {
  try {
    const pem = formatPublicKeyPem(params.publicKey);
    const verifier = crypto.createVerify("SHA256");
    verifier.update(params.challenge);
    verifier.end();

    const signatureBuffer = Buffer.from(params.signatureBase64, "base64");
    return verifier.verify(pem, signatureBuffer);
  } catch (err) {
    console.error("Biometric signature verification error:", err);
    return false;
  }
}

/**
 * Verifikasi PIN cadangan (jika biometrik gagal atau perangkat tidak mendukung)
 */
export function verifySignerPin(pin: string, pinHash: string | null | undefined): boolean {
  if (!pinHash || !pin) return false;
  return verifyPassword(pin, pinHash);
}
