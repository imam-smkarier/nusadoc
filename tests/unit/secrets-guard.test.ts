import { afterEach, describe, expect, it, vi } from "vitest";
import { signMobileJwt, verifyMobileJwt } from "@/lib/server/mobile-auth";
import { verifyMidtransSignature } from "@/lib/server/midtrans";

/**
 * Regresi: secret JWT mobile jatuh ke DATABASE_URL / literal di repo publik, dan signature
 * webhook "simulated" diterima kapan pun kunci Midtrans belum lengkap — termasuk production.
 */

const payload = { sub: "usr_x", email: "x@testing.co.id", name: "X", role: "admin", deviceId: "dev-x" };
const simulated = { orderId: "NSD-SUB-X", statusCode: "200", grossAmount: "50000.00", signatureKey: "simulated" };

afterEach(() => vi.unstubAllEnvs());

describe("secret JWT mobile", () => {
  it("production tanpa MOBILE_JWT_SECRET → menolak menerbitkan token", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MOBILE_JWT_SECRET", "");
    expect(() => signMobileJwt(payload)).toThrow(/MOBILE_JWT_SECRET/);
  });

  it("token yang ditandatangani secret lain tidak lolos verifikasi", () => {
    vi.stubEnv("MOBILE_JWT_SECRET", "secret-satu");
    const token = signMobileJwt(payload);
    expect(verifyMobileJwt(token)?.sub).toBe("usr_x");
    vi.stubEnv("MOBILE_JWT_SECRET", "secret-dua");
    expect(verifyMobileJwt(token)).toBeNull();
  });

  it("signature dengan panjang berbeda → null, bukan exception 500", () => {
    vi.stubEnv("MOBILE_JWT_SECRET", "secret-satu");
    const [h, b] = signMobileJwt(payload).split(".");
    expect(verifyMobileJwt(`${h}.${b}.pendek`)).toBeNull();
  });
});

describe("signature webhook 'simulated'", () => {
  it("ditolak di production walau kunci Midtrans kosong", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    expect(verifyMidtransSignature(simulated)).toBe(false);
  });

  it("ditolak di development bila server key sudah ada", () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", "SB-Mid-server-test");
    expect(verifyMidtransSignature(simulated)).toBe(false);
  });

  it("diterima hanya di development tanpa server key", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    expect(verifyMidtransSignature(simulated)).toBe(true);
  });
});
