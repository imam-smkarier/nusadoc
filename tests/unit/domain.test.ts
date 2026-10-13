import { describe, expect, it } from "vitest";
import {
  directInvoiceNumber,
  quotationNumber,
  receiptNumber,
  terminInvoiceNumber,
} from "@/lib/server/sequence";
import {
  nextInvoiceNumberFor,
  nextQuotationNumberFor,
  nextReceiptNumberFor,
} from "@/lib/numbering";
import { can } from "@/lib/permissions";
import { subscriptionCheckoutInput } from "@/lib/server/validation";
import { decryptSecret, encryptSecret, hasSecret } from "@/lib/server/secret";
import { verifyMidtransSignature } from "@/lib/server/midtrans";

describe("penomoran server-side (sequence.ts)", () => {
  it("format nomor quotation/invoice/kwitansi konsisten", () => {
    expect(quotationNumber("2026", "09", 1)).toBe("NSD/QUO/2026/09/001");
    expect(directInvoiceNumber("2026", "12", 25)).toBe("NSD/INV/2026/12/025");
    expect(receiptNumber("2026", "01", 999)).toBe("NSD/KWT/2026/01/999");
  });

  it("nomor termin diambil dari identitas penawaran (anti collision lintas bulan)", () => {
    // Penawaran terbit Agustus, invoice termin diterbitkan September:
    // nomor memakai periode penawaran, bukan bulan penerbitan.
    expect(terminInvoiceNumber("NSD/QUO/2026/08/007", 2)).toBe("NSD/INV/2026/08/007-T2");
  });

  it("pembulatan seq 3 digit", () => {
    expect(quotationNumber("2026", "01", 42)).toBe("NSD/QUO/2026/01/042");
  });
});

describe("penomoran fallback client-side (numbering.ts)", () => {
  it("seq berikutnya = max existing + 1 per periode", () => {
    const numbers = ["NSD/QUO/2026/09/003", "NSD/QUO/2026/09/014", "NSD/QUO/2026/08/099"];
    const { number, seq } = nextQuotationNumberFor(numbers, new Date("2026-09-15T00:00:00Z"));
    expect(seq).toBe(15);
    expect(number).toBe("NSD/QUO/2026/09/015");
  });

  it("periode bulan berbeda memulai seq dari 1", () => {
    const numbers = ["NSD/KWT/2026/09/005"];
    const { seq } = nextReceiptNumberFor(numbers, new Date("2026-10-01T00:00:00Z"));
    expect(seq).toBe(1);
  });

  it("invoice langsung tidak terpengaruh nomor invoice termin", () => {
    const direct = ["NSD/INV/2026/09/002"];
    const { number } = nextInvoiceNumberFor(
      direct,
      undefined,
      undefined,
      new Date("2026-09-20T00:00:00Z")
    );
    expect(number).toBe("NSD/INV/2026/09/003");
  });

  it("invoice termin dari penawaran seq 1 → NSD/INV/2026/09/001-T1", () => {
    const { number } = nextInvoiceNumberFor([], { seq: 1 } as never, 1, new Date("2026-09-20T00:00:00Z"));
    expect(number).toBe("NSD/INV/2026/09/001-T1");
  });
});

describe("RBAC permissions", () => {
  it("admin punya wildcard", () => {
    expect(can("admin", "payment.write")).toBe(true);
    expect(can("admin", "settings.update")).toBe(true);
  });

  it("finance boleh finansial, tidak boleh settings", () => {
    expect(can("finance", "payment.write")).toBe(true);
    expect(can("finance", "invoice.write")).toBe(true);
    expect(can("finance", "settings.update")).toBe(false);
  });

  it("sales boleh pra-tagihan, tidak boleh payment/approve", () => {
    expect(can("sales", "quotation.write")).toBe(true);
    expect(can("sales", "quotation.send")).toBe(true);
    expect(can("sales", "payment.write")).toBe(false);
    expect(can("sales", "quotation.decide")).toBe(false);
  });

  it("viewer tidak boleh menulis apa pun", () => {
    expect(can("viewer", "quotation.write")).toBe(false);
    expect(can("viewer", "clients.write")).toBe(false);
  });

  it("role tak dikenal ditolak", () => {
    expect(can(undefined, "payment.write")).toBe(false);
    expect(can("hacker", "*")).toBe(false);
  });
});

describe("validasi Zod checkout langganan", () => {
  it("plan harus bulanan/hakguna", () => {
    const r = subscriptionCheckoutInput.safeParse({
      plan: "gratisan",
      customerName: "Budi",
      customerEmail: "budi@klien.co.id",
    });
    expect(r.success).toBe(false);
  });

  it("email tidak valid ditolak", () => {
    const r = subscriptionCheckoutInput.safeParse({
      plan: "bulanan",
      customerName: "Budi",
      customerEmail: "bukan-email",
    });
    expect(r.success).toBe(false);
  });

  it("payload valid diterima; phone opsional", () => {
    const r = subscriptionCheckoutInput.safeParse({
      plan: "hakguna",
      customerName: "PT Klien Sejahtera",
      customerEmail: "finance@klien.co.id",
    });
    expect(r.success).toBe(true);
  });
});

describe("enkripsi kredensial delivery (AES-256-GCM)", () => {
  it("round-trip plaintext → ciphertext → plaintext", () => {
    const secret = "AppPassword-Kuat-123!@#";
    const enc = encryptSecret(secret);
    expect(enc).not.toContain(secret);
    expect(decryptSecret(enc)).toBe(secret);
  });

  it("setiap enkripsi memakai IV acak berbeda", () => {
    expect(encryptSecret("sama")).not.toBe(encryptSecret("sama"));
  });

  it("ciphertext korup menghasilkan string kosong (fail-safe)", () => {
    expect(decryptSecret("v1:aa:bb:cc")).toBe("");
    expect(decryptSecret("")).toBe("");
    expect(decryptSecret("bukan-format")).toBe("");
  });

  it("hasSecret menandai kredensial tersimpan", () => {
    expect(hasSecret(encryptSecret("xyz"))).toBe(true);
    expect(hasSecret("")).toBe(false);
  });
});

describe("verifikasi signature webhook Midtrans (SHA-512)", () => {
  it("signature salah ditolak", () => {
    expect(
      verifyMidtransSignature({
        orderId: "NSD-SUB-1",
        statusCode: "200",
        grossAmount: "249000.00",
        signatureKey: "palah",
      })
    ).toBe(false);
  });

  it("server key kosong → ditolak kecuali mode simulasi", () => {
    // MIDTRANS_SERVER_KEY tidak diset di test env → selain 'simulated' ditolak
    expect(
      verifyMidtransSignature({
        orderId: "NSD-SUB-1",
        statusCode: "200",
        grossAmount: "249000.00",
        signatureKey: "simulated",
      })
    ).toBe(true);
  });
});
