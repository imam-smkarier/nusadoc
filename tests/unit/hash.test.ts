import { describe, expect, it } from "vitest";
import { canonicalJson, computeDocumentHash, documentHashPayload, sha256 } from "@/lib/hash";

describe("sha256 — vektor standar", () => {
  it("hash string kosong sesuai referensi SHA-256", () => {
    expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("hash 'abc' sesuai referensi SHA-256", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("hash unicode multi-byte stabil", () => {
    const h = sha256("Terbilang: Satu Juta Dua Ratus Ribu Rupiah — Nusadoc ✓");
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });
});

describe("canonicalJson — serialisasi deterministik", () => {
  it("key diurutkan alfabetis di seluruh level", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it("undefined dibuang, null dipertahankan", () => {
    expect(canonicalJson({ a: undefined, b: null })).toBe('{"b":null}');
  });

  it("array dipertahankan urutannya", () => {
    expect(canonicalJson([{ b: 2, a: 1 }, { d: 4, c: 3 }])).toBe('[{"a":1,"b":2},{"c":3,"d":4}]');
  });
});

describe("computeDocumentHash — integritas payload dokumen", () => {
  const base = {
    number: "NSD/QUO/2026/09/001",
    seq: 1,
    clientId: "cli_1",
    subject: "Instalasi Jaringan",
    date: "2026-09-01",
    validUntil: "2026-09-30",
    items: [{ id: "i1", name: "Item", qty: 1, unit: "paket", unitPrice: 1_000_000 }],
    tax: { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    notes: "Catatan",
  };

  it("hash stabil untuk payload identik dengan urutan key berbeda", () => {
    const reordered = {
      tax: base.tax,
      items: base.items,
      validUntil: base.validUntil,
      date: base.date,
      subject: base.subject,
      clientId: base.clientId,
      seq: base.seq,
      number: base.number,
      notes: base.notes,
    };
    expect(computeDocumentHash("quotation", base)).toBe(computeDocumentHash("quotation", reordered));
  });

  it("perubahan nested items/tax mengubah hash (menutup bug replacer lama)", () => {
    const changed = structuredClone(base);
    changed.items[0].unitPrice = 1_000_001;
    expect(computeDocumentHash("quotation", base)).not.toBe(computeDocumentHash("quotation", changed));
  });

  it("payload quotation mencakup seluruh field yang tampak", () => {
    const payload = documentHashPayload("quotation", base);
    expect(Object.keys(payload).sort()).toEqual(
      ["clientId", "date", "items", "kind", "notes", "number", "seq", "subject", "tax", "validUntil"].sort()
    );
  });

  it("payload invoice mencakup identitas termin", () => {
    const payload = documentHashPayload("invoice", {
      number: "NSD/INV/2026/09/001-T2",
      seq: 1,
      clientId: "cli_1",
      subject: "S",
      date: "2026-09-01",
      dueDate: "2026-09-16",
      items: base.items,
      tax: base.tax,
      notes: "",
      quotationId: "quo_1",
      terminIndex: 2,
      terminLabel: "Progres 30%",
      terminPct: 30,
    });
    expect(payload.terminIndex).toBe(2);
    expect(payload.terminPct).toBe(30);
    expect(payload.quotationId).toBe("quo_1");
  });

  it("payload receipt mengubah amount BigInt ke number", () => {
    const payload = documentHashPayload("receipt", {
      number: "NSD/KWT/2026/09/001",
      seq: 1,
      paymentId: "pay_1",
      invoiceId: "inv_1",
      clientId: "cli_1",
      amount: BigInt(5_000_000),
      method: "Transfer Bank",
      date: "2026-09-10",
      forPaymentOf: "DP",
    });
    expect(payload.amount).toBe(5_000_000);
    expect(typeof payload.amount).toBe("number");
  });

  it("hash quotation ≠ hash invoice untuk isi sama (kind ikut dalam payload)", () => {
    const q = computeDocumentHash("quotation", base);
    const i = computeDocumentHash("invoice", {
      ...base,
      dueDate: "2026-09-16",
      quotationId: null,
      terminIndex: null,
      terminLabel: null,
      terminPct: null,
    });
    expect(q).not.toBe(i);
  });
});
