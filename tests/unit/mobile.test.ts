import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { signMobileJwt, verifyMobileJwt } from "@/lib/server/mobile-auth";
import {
  createSignatureChallenge,
  formatPublicKeyPem,
  verifyBiometricSignature,
  verifySignerPin,
} from "@/lib/server/biometric-verify";
import { hashPassword } from "@/lib/server/password";

describe("mobile JWT auth — otentikasi mobile native node:crypto", () => {
  const payload = {
    sub: "user_admin",
    email: "admin@smkarier.co.id",
    name: "Admin Keuangan",
    role: "admin",
    deviceId: "iphone-15-pro-uuid-1234",
  };

  it("sign and verify token menghasilkan payload identik", () => {
    const token = signMobileJwt(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const verified = verifyMobileJwt(token);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe(payload.sub);
    expect(verified?.role).toBe(payload.role);
    expect(verified?.deviceId).toBe(payload.deviceId);
  });

  it("token yang diubah (tampered) ditolak dengan aman", () => {
    const token = signMobileJwt(payload);
    const parts = token.split(".");
    // Ubah 1 karakter pada signature
    const badSignature = parts[2].slice(0, -1) + (parts[2].slice(-1) === "a" ? "b" : "a");
    const tampered = `${parts[0]}.${parts[1]}.${badSignature}`;

    expect(verifyMobileJwt(tampered)).toBeNull();
  });

  it("format token tidak valid (tanpa 3 segmen) ditolak", () => {
    expect(verifyMobileJwt("bukan.token")).toBeNull();
    expect(verifyMobileJwt("")).toBeNull();
  });
});

describe("biometric TTE verification — ECDSA P-256 (Secure Enclave emulation)", () => {
  it("signature asli yang ditandatangani private key P-256 diverifikasi valid", () => {
    // Generate pasangan kunci ECDSA P-256 standar (persis yang dibuat Secure Enclave / Keystore)
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const docId = "quo_test_123";
    const docHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const timestamp = Date.now();
    const challenge = createSignatureChallenge(docId, docHash, timestamp);

    // Simulasi Secure Enclave ponsel menandatangani challenge dengan private key
    const signer = crypto.createSign("SHA256");
    signer.update(challenge);
    signer.end();
    const signatureBase64 = signer.sign(privateKey).toString("base64");

    // Server memverifikasi dengan public key yang terdaftar
    const verified = verifyBiometricSignature({
      publicKey,
      challenge,
      signatureBase64,
    });
    expect(verified).toBe(true);

    // Uji proteksi: jika dokumen diubah 1 karakter setelah tanda tangan, verifikasi harus GAGAL
    const tamperedChallenge = createSignatureChallenge(docId, "hash-berbeda", timestamp);
    const tamperedVerified = verifyBiometricSignature({
      publicKey,
      challenge: tamperedChallenge,
      signatureBase64,
    });
    expect(tamperedVerified).toBe(false);
  });

  it("formatPublicKeyPem membungkus base64 menjadi SPKI PEM yang valid", () => {
    const rawBase64 = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7p9n0V...";
    const pem = formatPublicKeyPem(rawBase64);
    expect(pem).toContain("-----BEGIN PUBLIC KEY-----");
    expect(pem).toContain("-----END PUBLIC KEY-----");
  });
});

describe("backup PIN verification — scrypt PIN hash", () => {
  it("PIN 6-digit cocok dengan hash", () => {
    const pin = "123456";
    const hash = hashPassword(pin);
    expect(verifySignerPin(pin, hash)).toBe(true);
    expect(verifySignerPin("654321", hash)).toBe(false);
    expect(verifySignerPin("", hash)).toBe(false);
  });
});
