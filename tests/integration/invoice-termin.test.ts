// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Integration — route POST /api/invoices terhadap MySQL dev (nusadoc_dev), tenant uji terisolasi.
 * Regresi: counter `TERM-{quotationId}` tidak pernah dibuat (tanpa ensureCounter), sehingga
 * setiap termin mendapat indeks 1 → termin kedua/ketiga bentrok unique constraint (500).
 * Sesi, kuota, audit, dan pengiriman di-mock; selebihnya kode route & DB asli.
 */

const { ORG } = vi.hoisted(() => ({ ORG: `org_test_termin_${Date.now()}` }));

vi.mock("@/lib/server/auth", () => ({
  requirePermission: async () => ({
    id: "usr_test_termin",
    email: "termin@testing.co.id",
    name: "Uji Termin",
    role: "admin",
    organizationId: ORG,
  }),
  isResponse: (v: unknown) => v instanceof Response,
}));
vi.mock("@/lib/server/plan", () => ({ assertCanPublish: async () => null }));
vi.mock("@/lib/server/audit", () => ({ logAudit: async () => {} }));
vi.mock("@/lib/server/deliver-doc", () => ({ deliverDocument: () => {} }));

const { POST } = await import("@/app/api/invoices/route");
const { prisma } = await import("@/lib/server/db");

const CLIENT_ID = `cli_${ORG}`;
const TAX = { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 };
const ITEMS = [{ id: "it1", name: "Instalasi jaringan", qty: 1, unit: "paket", unitPrice: 10_000_000 }];
let seq = 0;

async function approvedQuotation(): Promise<string> {
  seq += 1;
  const id = `quo_${ORG}_${seq}`;
  await prisma.quotation.create({
    data: {
      id,
      organizationId: ORG,
      number: `NSD/QUO/2026/10/${String(900 + seq)}`,
      seq: 900 + seq,
      status: "approved",
      clientId: CLIENT_ID,
      subject: "[TEST] Proyek termin",
      date: new Date("2026-10-01"),
      validUntil: new Date("2026-10-31"),
      items: ITEMS,
      token: `tok_${ORG}_${seq}`,
      hash: "test",
    },
  });
  return id;
}

function publishTermin(quotationId: string, terminPct: number) {
  const body = {
    clientId: CLIENT_ID,
    subject: "[TEST] Termin",
    date: "2026-10-13",
    dueDate: "2026-10-27",
    items: [],
    tax: TAX,
    quotationId,
    terminLabel: `Termin ${terminPct}%`,
    terminPct,
  };
  return POST(
    new NextRequest("http://localhost/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

beforeAll(async () => {
  await prisma.organization.create({ data: { id: ORG, name: "[TEST] Org Termin", plan: "bulanan" } });
  await prisma.client.create({
    data: { id: CLIENT_ID, organizationId: ORG, code: "CL-001", name: "[TEST] Klien Termin", address: "Jl. Uji", createdAt: new Date() },
  });
});

afterAll(async () => {
  const quotations = await prisma.quotation.findMany({ where: { organizationId: ORG }, select: { id: true } });
  await prisma.invoice.deleteMany({ where: { organizationId: ORG } });
  await prisma.quotation.deleteMany({ where: { organizationId: ORG } });
  await prisma.client.deleteMany({ where: { organizationId: ORG } });
  await prisma.documentCounter.deleteMany({
    where: { OR: [{ key: { in: quotations.map((q) => `TERM-${q.id}`) } }, { key: { startsWith: `${ORG}:` } }] },
  });
  await prisma.organization.deleteMany({ where: { id: ORG } });
});

describe("POST /api/invoices — counter termin", () => {
  it("penawaran baru: T1 lalu T2 berurutan, lalu termin yang melewati 100% ditolak 422", async () => {
    const q = await approvedQuotation();

    const r1 = await publishTermin(q, 50);
    expect(r1.status).toBe(201);
    expect((await r1.json()).number).toMatch(/-T1$/);

    const r2 = await publishTermin(q, 50);
    expect(r2.status).toBe(201);
    expect((await r2.json()).number).toMatch(/-T2$/);

    const r3 = await publishTermin(q, 10);
    expect(r3.status).toBe(422);
  });

  it("penawaran lama dengan T1/T2 tanpa baris counter → termin berikutnya T3, bukan bentrok", async () => {
    const q = await approvedQuotation();
    const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: q } });
    for (const t of [1, 2]) {
      await prisma.invoice.create({
        data: {
          id: `inv_${ORG}_legacy_${t}`,
          organizationId: ORG,
          number: `${quotation.number.replace("/QUO/", "/INV/")}-T${t}`,
          seq: quotation.seq,
          terminIndex: t,
          terminLabel: `Termin ${t}`,
          terminPct: 30,
          quotationId: q,
          clientId: CLIENT_ID,
          subject: "[TEST] Termin lama",
          date: new Date("2026-10-02"),
          dueDate: new Date("2026-10-16"),
          items: ITEMS,
          token: `tok_${ORG}_legacy_${t}`,
          hash: "test",
        },
      });
    }

    const res = await publishTermin(q, 40);
    expect(res.status).toBe(201);
    const inv = await res.json();
    expect(inv.number).toMatch(/-T3$/);
    expect(inv.terminIndex).toBe(3);
  });

  it("dua termin paralel yang bersama melebihi 100% → tepat satu terbit, satu 422", async () => {
    const q = await approvedQuotation();

    const statuses = (await Promise.all([publishTermin(q, 60), publishTermin(q, 60)])).map((r) => r.status).sort();

    expect(statuses).toEqual([201, 422]);
    expect(await prisma.invoice.count({ where: { quotationId: q } })).toBe(1);
  });
});
