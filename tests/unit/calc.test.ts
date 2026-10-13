import { describe, expect, it } from "vitest";
import {
  computeInvoiceStatus,
  computeTotals,
  effectiveQuotationStatus,
  scaleItems,
  TERMIN_PRESETS,
} from "@/lib/calc";
import type { Invoice, LineItem, Payment, Quotation } from "@/lib/types";

const line = (id: string, qty: number, unitPrice: number): LineItem => ({
  id,
  name: `Item ${id}`,
  qty,
  unit: "paket",
  unitPrice,
});

const makeInvoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: "inv_1",
  kind: "invoice",
  number: "NSD/INV/2026/09/001-T1",
  seq: 1,
  clientId: "cli_1",
  subject: "Test",
  date: "2026-09-01",
  dueDate: "2026-09-16",
  items: [line("a", 1, 10_000_000)],
  tax: { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
  notes: "",
  token: "NSD-XXXX-XXXX-XXXX",
  hash: "h",
  issuedAt: "2026-09-01T00:00:00.000Z",
  ...over,
});

const makePayment = (over: Partial<Payment>): Payment => ({
  id: "pay_1",
  invoiceId: "inv_1",
  date: "2026-09-10",
  amount: 5_000_000,
  method: "Transfer Bank",
  receiptId: "rcp_1",
  ...over,
});

describe("computeTotals — perhitungan nilai dokumen", () => {
  it("subtotal = Σ(qty × unitPrice) dengan pembulatan per baris", () => {
    const t = computeTotals([line("a", 2, 1_000_500), line("b", 1, 999_500)], {
      ppnEnabled: false,
      ppnRate: 11,
      pph23Enabled: false,
      pph23Rate: 2,
    });
    expect(t.subtotal).toBe(3_000_500);
    expect(t.ppn).toBe(0);
    expect(t.pph23).toBe(0);
    expect(t.total).toBe(3_000_500);
  });

  it("PPN 11% aktif menambah total", () => {
    const t = computeTotals([line("a", 1, 10_000_000)], {
      ppnEnabled: true,
      ppnRate: 11,
      pph23Enabled: false,
      pph23Rate: 2,
    });
    expect(t.subtotal).toBe(10_000_000);
    expect(t.ppn).toBe(1_100_000);
    expect(t.total).toBe(11_100_000);
  });

  it("PPh 23 aktif memotong total (dipotong pemberi kerja)", () => {
    const t = computeTotals([line("a", 1, 10_000_000)], {
      ppnEnabled: false,
      ppnRate: 11,
      pph23Enabled: true,
      pph23Rate: 2,
    });
    expect(t.pph23).toBe(200_000);
    expect(t.total).toBe(9_800_000);
  });

  it("PPN + PPh 23 bersamaan: subtotal + PPN − PPh23", () => {
    const t = computeTotals([line("a", 1, 50_000_000)], {
      ppnEnabled: true,
      ppnRate: 11,
      pph23Enabled: true,
      pph23Rate: 2,
    });
    expect(t.total).toBe(50_000_000 + 5_500_000 - 1_000_000);
  });

  it("items kosong menghasilkan nol", () => {
    const t = computeTotals([], { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 });
    expect(t.subtotal).toBe(0);
    expect(t.total).toBe(0);
  });
});

describe("scaleItems — proporsional termin", () => {
  it("skala unitPrice per baris dengan pembulatan rupiah", () => {
    const scaled = scaleItems([line("a", 1, 10_000_001), line("b", 3, 333_333)], 50);
    expect(scaled[0].unitPrice).toBe(5_000_001); // round(10_000_001 × 0.5) = 5_000_000.5 → 5_000_001
    expect(scaled[1].unitPrice).toBe(166_667); // round(333_333 × 0.5) = 166_666.5 → 166_667
    expect(scaled[0].qty).toBe(1); // qty & unit tidak berubah
  });

  it("100% tidak mengubah nilai", () => {
    const items = [line("a", 2, 7_777_777)];
    expect(scaleItems(items, 100)).toEqual(items);
  });
});

describe("computeInvoiceStatus — status kalkulatif dari kwitansi", () => {
  const today = new Date();
  const pastDue = new Date(today.getTime() - 10 * 86_400_000).toISOString().slice(0, 10);
  const futureDue = new Date(today.getTime() + 10 * 86_400_000).toISOString().slice(0, 10);

  it("paid = 0 & belum jatuh tempo → sent", () => {
    const inv = makeInvoice({ dueDate: futureDue });
    expect(computeInvoiceStatus(inv, [])).toBe("sent");
  });

  it("paid = 0 & lewat jatuh tempo → overdue", () => {
    const inv = makeInvoice({ dueDate: pastDue });
    expect(computeInvoiceStatus(inv, [])).toBe("overdue");
  });

  it("pembayaran parsial → partial (meski lewat jatuh tempo)", () => {
    const inv = makeInvoice({ dueDate: pastDue });
    expect(computeInvoiceStatus(inv, [makePayment({})])).toBe("partial");
  });

  it("akumulasi ≥ total → paid", () => {
    const inv = makeInvoice();
    const total = computeTotals(inv.items, inv.tax).total; // 11.100.000
    expect(computeInvoiceStatus(inv, [makePayment({ amount: total })])).toBe("paid");
  });

  it("pembayaran bertahap parsial tetap partial sampai lunas", () => {
    const inv = makeInvoice();
    expect(
      computeInvoiceStatus(inv, [
        makePayment({ id: "p1", amount: 3_000_000 }),
        makePayment({ id: "p2", amount: 4_000_000 }),
      ])
    ).toBe("partial");
  });
});

describe("effectiveQuotationStatus — kedaluwarsa otomatis", () => {
  const today = new Date();
  const pastValid = new Date(today.getTime() - 5 * 86_400_000).toISOString().slice(0, 10);
  const futureValid = new Date(today.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);

  const makeQuotation = (over: Partial<Quotation>): Quotation => ({
    id: "quo_1",
    kind: "quotation",
    number: "NSD/QUO/2026/09/001",
    seq: 1,
    status: "sent",
    clientId: "cli_1",
    subject: "Test",
    date: "2026-09-01",
    validUntil: futureValid,
    items: [],
    tax: { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    token: "t",
    hash: "h",
    issuedAt: "2026-09-01T00:00:00.000Z",
    ...over,
  });

  it("sent + validUntil lewat → expired (tanpa ubah data)", () => {
    expect(effectiveQuotationStatus(makeQuotation({ validUntil: pastValid }))).toBe("expired");
  });

  it("sent + masih berlaku → sent", () => {
    expect(effectiveQuotationStatus(makeQuotation({}))).toBe("sent");
  });

  it("approved tetap approved walau validUntil lewat", () => {
    expect(effectiveQuotationStatus(makeQuotation({ status: "approved", validUntil: pastValid }))).toBe("approved");
  });
});

describe("TERMIN_PRESETS — total preset wajar", () => {
  it("setiap preset memiliki pct di rentang 1–100", () => {
    for (const p of TERMIN_PRESETS) {
      expect(p.pct).toBeGreaterThan(0);
      expect(p.pct).toBeLessThanOrEqual(100);
    }
  });
});
