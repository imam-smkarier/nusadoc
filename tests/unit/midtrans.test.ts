import { describe, expect, it } from "vitest";
import { SUBSCRIPTION_PLANS, verifyMidtransSignature } from "@/lib/server/midtrans";
import crypto from "node:crypto";

describe("SUBSCRIPTION_PLANS — kontrak paket Nusadoc", () => {
  it("Bulanan Rp 249.000, interval monthly, 30 hari", () => {
    const p = SUBSCRIPTION_PLANS.bulanan;
    expect(p.amount).toBe(249_000);
    expect(p.interval).toBe("monthly");
    expect(p.durationDays).toBe(30);
  });

  it("Hak Guna Rp 19.900.000, lifetime, tanpa durasi", () => {
    const p = SUBSCRIPTION_PLANS.hakguna;
    expect(p.amount).toBe(19_900_000);
    expect(p.interval).toBe("lifetime");
    expect(p.durationDays).toBeNull();
  });
});

describe("verifyMidtransSignature — formula Midtrans resmi", () => {
  it("cocok dengan SHA512(order_id+status_code+gross_amount+serverKey) saat server key diset", () => {
    // Suntikkan server key sementara via process env
    const original = process.env.MIDTRANS_SERVER_KEY;
    process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-test-key";

    try {
      const orderId = "NSD-SUB-20260928-TEST1";
      const statusCode = "200";
      const grossAmount = "249000.00";
      const expected = crypto
        .createHash("sha512")
        .update(`${orderId}${statusCode}${grossAmount}SB-Mid-server-test-key`)
        .digest("hex");

      expect(
        verifyMidtransSignature({ orderId, statusCode, grossAmount, signatureKey: expected })
      ).toBe(true);

      // Tamper 1 rupiah → signature tidak cocok
      expect(
        verifyMidtransSignature({
          orderId,
          statusCode,
          grossAmount: "250000.00",
          signatureKey: expected,
        })
      ).toBe(false);
    } finally {
      if (original === undefined) delete process.env.MIDTRANS_SERVER_KEY;
      else process.env.MIDTRANS_SERVER_KEY = original;
    }
  });
});
