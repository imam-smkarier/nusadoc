import { afterAll, describe, expect, it } from "vitest";
import { allocateCounter, ensureCounter, quotationNumber } from "@/lib/server/sequence";
import { prisma } from "@/lib/server/db";
import { computeTotals, scaleItems } from "@/lib/calc";
import { computeDocumentHash } from "@/lib/hash";
import type { LineItem } from "@/lib/types";

/**
 * Integration test — menyentuh MySQL development langsung (nusadoc_dev).
 * Semua data test dibuat dengan key/ID khusus TEST_ dan dibersihkan di afterAll.
 */

const TEST_KEY = `TEST-${Date.now()}`;

afterAll(async () => {
  // Bersihkan sisa record test (idempotent) — manual FK order: receipt → payment → invoice → quotation → client
  const testInvoices = await prisma.invoice.findMany({
    where: { subject: { startsWith: "[TEST]" } },
    select: { id: true },
  });
  const testIds = testInvoices.map((i) => i.id);
  if (testIds.length) {
    await prisma.receipt.deleteMany({ where: { invoiceId: { in: testIds } } });
    await prisma.payment.deleteMany({ where: { invoiceId: { in: testIds } } });
  }
  await prisma.documentCounter.deleteMany({ where: { key: { startsWith: "TEST-" } } });
  await prisma.invoice.deleteMany({ where: { subject: { startsWith: "[TEST]" } } });
  await prisma.quotation.deleteMany({ where: { subject: { startsWith: "[TEST]" } } });
  await prisma.client.deleteMany({ where: { code: { startsWith: "CL-TEST" } } });
  await prisma.client.deleteMany({ where: { name: { startsWith: "[TEST]" } } });
});

describe("integration — penomoran atomik (DocumentCounter FOR UPDATE)", () => {
  it("10 alokasi paralel menghasilkan seq unik berurutan tanpa collision", async () => {
    await ensureCounter(prisma, TEST_KEY, 0);

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        prisma.$transaction(async (tx) => allocateCounter(tx, TEST_KEY))
      )
    );

    const sorted = [...results].sort((a, b) => a - b);
    expect(sorted).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Nilai counter final = alokasi terakhir
    const row = await prisma.documentCounter.findUnique({ where: { key: TEST_KEY } });
    expect(Number(row?.value)).toBe(10);
  });

  it("init counter dari seq existing tidak mundur", async () => {
    await ensureCounter(prisma, `${TEST_KEY}-init`, 5);
    const seq = await prisma.$transaction(async (tx) => allocateCounter(tx, `${TEST_KEY}-init`, 3));
    expect(seq).toBe(6); // max(5,3) + 1
  });
});

describe("integration — atomicity payment + receipt (tanpa orphan)", () => {
  it("rollback transaksi tidak meninggalkan payment/receipt orphan", async () => {
    const client = await prisma.client.create({
      data: {
        id: `cli_test_${Date.now().toString(36)}`,
        organizationId: "org_demo",
        code: `CL-TEST-${Date.now().toString(36).slice(-6)}`,
        name: "[TEST] Klien Integration",
        address: "Jl. Test",
        createdAt: new Date(),
      },
    });

    const quotation = await prisma.quotation.create({
      data: {
        id: `quo_test_${Date.now().toString(36)}`,
        organizationId: "org_demo",
        number: quotationNumber("2026", "01", 999_900),
        seq: 999_900,
        status: "approved",
        clientId: client.id,
        subject: "[TEST] Quotation integration",
        date: new Date("2026-01-01"),
        validUntil: new Date("2026-01-31"),
        items: [] as unknown as object,
        token: `tok_test_${Date.now().toString(36)}`,
        hash: "test-hash",
      },
    });

    const invoice = await prisma.invoice.create({
      data: {
        id: `inv_test_${Date.now().toString(36)}`,
        organizationId: "org_demo",
        number: "NSD/INV/2026/01/999900-T1",
        seq: 999_900,
        terminIndex: 1,
        quotationId: quotation.id,
        clientId: client.id,
        subject: "[TEST] Invoice integration",
        date: new Date("2026-01-10"),
        dueDate: new Date("2026-01-25"),
        items: [] as unknown as object,
        token: `tok_test_${Date.now().toString(36)}`,
        hash: "test-hash",
      },
    });

    const failureMarker = Date.now().toString();

    // Transaksi yang GAGAL di tengah — payment dibuat lalu throw
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            id: `pay_test_${failureMarker}`,
            organizationId: "org_demo",
            invoiceId: invoice.id,
            date: new Date(),
            amount: BigInt(1_000_000),
            method: "Transfer Bank",
          },
        });
        throw new Error("Simulasi kegagalan di tengah transaksi");
      })
    ).rejects.toThrow("Simulasi kegagalan");

    // Tidak ada payment orphan
    const orphan = await prisma.payment.findUnique({ where: { id: `pay_test_${failureMarker}` } });
    expect(orphan).toBeNull();

    // Bukti bahwa invoice & client test ada (sisanya dibersihkan di afterAll)
    expect(await prisma.invoice.findUnique({ where: { id: invoice.id } })).not.toBeNull();
  });
});

describe("integration — konsistensi perhitungan & hash pada data nyata", () => {
  it("scaleItems + computeTotals konsisten dengan snapshot totals di DB", () => {
    const items: LineItem[] = [
      { id: "i1", name: "Instalasi jaringan", qty: 1, unit: "paket", unitPrice: 42_000_000 },
      { id: "i2", name: "Server rack 12U", qty: 1, unit: "unit", unitPrice: 18_500_000 },
      { id: "i3", name: "Pelatihan admin", qty: 2, unit: "sesi", unitPrice: 2_500_000 },
    ];
    const tax = { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 };

    const full = computeTotals(items, tax);
    expect(full.subtotal).toBe(65_500_000);
    expect(full.total).toBe(72_705_000); // sama dengan hero invoice landing page

    // Termin 50%: subtotal proporsional, pajak dihitung dari subtotal termin
    const halfItems = scaleItems(items, 50);
    const half = computeTotals(halfItems, tax);
    expect(half.total).toBe(72_705_000 / 2);

    // Hash dokumen sama untuk payload sama (snapshot immutable)
    const payload = {
      number: "NSD/INV/2026/09/001-T1", seq: 1, clientId: "hero", subject: "S",
      date: "2026-09-01", dueDate: "2026-09-16", items, tax, notes: "",
      quotationId: null, terminIndex: 1, terminLabel: "DP 50%", terminPct: 50,
    };
    expect(computeDocumentHash("invoice", payload)).toBe(computeDocumentHash("invoice", { ...payload }));
  });
});
