import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/server/db";
import { getOrgEntitlements, assertCanPublish } from "@/lib/server/plan";
import { hashPassword } from "@/lib/server/password";
import { asDate } from "@/lib/server/map";
import { computeDocumentHash } from "@/lib/hash";

const TEST_EMAIL = `saas-test-${Date.now()}@testing.co.id`;
let testOrgId = "";
let testUserId = "";

afterAll(async () => {
  if (testOrgId) {
    // Bersihkan tenant test
    await prisma.receipt.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.payment.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.invoice.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.quotation.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.client.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.companySettings.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.session.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.subscription.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
  }
});

describe("SaaS Multi-Tenant & Quota Enforcement Integration", () => {
  it("pendaftaran menghasilkan Organization (trial 30d) + User + CompanySettings terisolasi", async () => {
    testOrgId = `org_test_${Date.now()}`;
    testUserId = `usr_test_${Date.now()}`;
    const trialEndsAt = new Date(Date.now() + 30 * 86_400_000);

    const [org, user, settings] = await prisma.$transaction([
      prisma.organization.create({
        data: {
          id: testOrgId,
          name: "PT Test Solusi SaaS",
          plan: "trial",
          trialEndsAt,
        },
      }),
      prisma.user.create({
        data: {
          id: testUserId,
          organizationId: testOrgId,
          email: TEST_EMAIL,
          name: "Owner Test",
          passwordHash: hashPassword("password123"),
          role: "admin",
        },
      }),
      prisma.companySettings.create({
        data: {
          id: `cs_${testOrgId}`,
          organizationId: testOrgId,
          name: "PT Test Solusi SaaS",
          tagline: "SaaS Testing",
          email: TEST_EMAIL,
          banks: [],
          defaultNotesQuotation: "",
          defaultNotesInvoice: "",
        },
      }),
    ]);

    expect(org.plan).toBe("trial");
    expect(user.organizationId).toBe(testOrgId);
    expect(settings.organizationId).toBe(testOrgId);

    // Cek entitlements
    const ent = await getOrgEntitlements(testOrgId);
    expect(ent.status).toBe("trial");
    expect(ent.plan).toBe("trial");
    expect(ent.canPublish).toBe(true);
    expect(ent.docsLimit).toBeNull(); // unlimited during trial
    expect(ent.daysRemaining).toBeGreaterThanOrEqual(29);

    // Guard tidak memblokir trial yang aktif
    const blocked = await assertCanPublish(testOrgId);
    expect(blocked).toBeNull();
  });

  it("paket Lite (Rp 50.000) membatasi maksimal 25 dokumen per bulan kalender", async () => {
    // Ubah plan organisasi menjadi 'lite'
    await prisma.organization.update({
      where: { id: testOrgId },
      data: { plan: "lite", trialEndsAt: null },
    });

    const client = await prisma.client.create({
      data: {
        id: `cli_test_${Date.now()}`,
        organizationId: testOrgId,
        code: "CL-001",
        name: "Klien Uji Kuota",
        address: "Jl. Kuota",
        createdAt: new Date(),
      },
    });

    // Masukkan 25 quotation dalam bulan ini untuk menghabiskan kuota
    const now = new Date();
    for (let i = 1; i <= 25; i++) {
      await prisma.quotation.create({
        data: {
          id: `quo_quota_${i}_${Date.now()}`,
          organizationId: testOrgId,
          number: `NSD/QUO/2026/10/${String(i).padStart(3, "0")}`,
          seq: i,
          status: "draft",
          clientId: client.id,
          subject: `Dokumen ke-${i}`,
          date: asDate("2026-10-01"),
          validUntil: asDate("2026-10-31"),
          items: [],
          token: `tok_quota_${i}_${Date.now()}`,
          hash: computeDocumentHash("quotation", {
            number: `NSD/QUO/2026/10/${String(i).padStart(3, "0")}`,
            seq: i,
            clientId: client.id,
            subject: `Dokumen ke-${i}`,
            date: "2026-10-01",
            validUntil: "2026-10-31",
            items: [],
            tax: { ppnEnabled: false, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
            notes: "",
          }),
          issuedAt: now,
        },
      });
    }

    const ent = await getOrgEntitlements(testOrgId);
    expect(ent.docsUsed).toBe(25);
    expect(ent.docsLimit).toBe(25);
    expect(ent.docsRemaining).toBe(0);
    expect(ent.canPublish).toBe(false);

    // Guard assertCanPublish menolak penerbitan ke-26 dengan HTTP 402!
    const blocked = await assertCanPublish(testOrgId);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(402);

    const json = (await blocked?.json()) as { code: string; error: string };
    expect(json.code).toBe("DOCUMENT_QUOTA_EXCEEDED");
    expect(json.error).toContain("25/25");
  });

  it("upgrade ke paket Bulanan / Hak Guna membuka kembali akses unlimited dokumen", async () => {
    // Simulasikan upgrade ke 'bulanan'
    await prisma.organization.update({
      where: { id: testOrgId },
      data: { plan: "bulanan" },
    });

    const ent = await getOrgEntitlements(testOrgId);
    expect(ent.plan).toBe("bulanan");
    expect(ent.docsLimit).toBeNull(); // Unlimited
    expect(ent.canPublish).toBe(true);

    const blocked = await assertCanPublish(testOrgId);
    expect(blocked).toBeNull();
  });
});
