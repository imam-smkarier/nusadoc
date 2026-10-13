import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { PLAN_CATALOG, type PlanId } from "@/lib/plans";

/**
 * Entitlements organisasi: paket efektif, kuota dokumen bulan berjalan, dan
 * status akses (active | trial | expired). Status invoice tetap kalkulatif;
 * entitlement hanya mengatur KANVAS terbit dokumen baru (read-only saat expired).
 */

export type OrgStatus = "active" | "trial" | "expired";

export interface OrgEntitlements {
  organizationId: string;
  name: string;
  plan: PlanId;
  /** status akses terbit dokumen */
  status: OrgStatus;
  /** null = unlimited */
  docsLimit: number | null;
  docsUsed: number;
  docsRemaining: number | null;
  canPublish: boolean;
  trialEndsAt: string | null;
  /** berlaku sampai (paket bulanan); null = lifetime / trial */
  currentPeriodEnd: string | null;
  /** sisa hari (trial atau periode bulanan); null = unlimited */
  daysRemaining: number | null;
}

const MONTHLY_PLANS: PlanId[] = ["lite", "bulanan"];

/** Hitung dokumen terbit organisasi pada bulan kalender berjalan. */
export async function getMonthlyDocumentUsage(organizationId: string): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [quotations, invoices, receipts] = await Promise.all([
    prisma.quotation.count({ where: { organizationId, issuedAt: { gte: startOfMonth } } }),
    prisma.invoice.count({ where: { organizationId, issuedAt: { gte: startOfMonth } } }),
    prisma.receipt.count({ where: { organizationId, issuedAt: { gte: startOfMonth } } }),
  ]);

  return quotations + invoices + receipts;
}

/** Entitlement lengkap organisasi — dipakai API, UI, dan enforcement. */
export async function getOrgEntitlements(organizationId: string): Promise<OrgEntitlements> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) {
    // Fallback defensif (tidak seharusnya terjadi — semua user wajib ber-org)
    return {
      organizationId,
      name: "Workspace",
      plan: "expired" as unknown as PlanId,
      status: "expired",
      docsLimit: 0,
      docsUsed: 0,
      docsRemaining: 0,
      canPublish: false,
      trialEndsAt: null,
      currentPeriodEnd: null,
      daysRemaining: 0,
    };
  }

  const plan = (PLAN_CATALOG[org.plan as PlanId] ? (org.plan as PlanId) : "trial") as PlanId;
  const meta = PLAN_CATALOG[plan];
  const now = new Date();
  const docsUsed = await getMonthlyDocumentUsage(organizationId);

  let status: OrgStatus = "active";
  let daysRemaining: number | null = null;
  let currentPeriodEnd: string | null = null;
  let trialEndsAt: string | null = null;

  if (plan === "trial") {
    trialEndsAt = org.trialEndsAt ? org.trialEndsAt.toISOString() : null;
    const trialEnd = org.trialEndsAt ?? new Date(now.getTime() + 30 * 86_400_000);
    const msLeft = trialEnd.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(msLeft / 86_400_000));
    status = msLeft > 0 ? "trial" : "expired";
  } else if (MONTHLY_PLANS.includes(plan)) {
    // Periode paket berbayar bulanan diambil dari subscription aktif terbaru org
    const sub = await prisma.subscription.findFirst({
      where: { organizationId, plan, status: "active" },
      orderBy: { paidAt: "desc" },
    });
    const periodEnd = sub?.currentPeriodEnd ?? null;
    if (periodEnd) {
      currentPeriodEnd = periodEnd.toISOString();
      const msLeft = periodEnd.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(msLeft / 86_400_000));
      status = msLeft > 0 ? "active" : "expired";
    } else {
      // Subscription aktif tanpa periode (anomali) — anggap aktif
      status = "active";
    }
  } else {
    // hakguna / enterprise = lifetime
    status = "active";
    daysRemaining = null;
  }

  const docsLimit = meta.docsLimit;
  const docsRemaining = docsLimit === null ? null : Math.max(0, docsLimit - docsUsed);
  const canPublish = status !== "expired" && (docsLimit === null || docsUsed < docsLimit);

  return {
    organizationId: org.id,
    name: org.name,
    plan,
    status,
    docsLimit,
    docsUsed,
    docsRemaining,
    canPublish,
    trialEndsAt,
    currentPeriodEnd,
    daysRemaining,
  };
}

/**
 * Guard penerbitan dokumen: tolak 402 (Payment Required) bila paket kedaluwarsa
 * atau kuota bulanan terlampaui. Pesan berbahasa Indonesia + arahan upgrade.
 */
export async function assertCanPublish(organizationId: string): Promise<NextResponse | null> {
  const ent = await getOrgEntitlements(organizationId);
  if (ent.canPublish) return null;

  const upgradePath = "/langganan";

  if (ent.status === "expired") {
    const isTrial = ent.plan === "trial";
    return NextResponse.json(
      {
        error: isTrial
          ? `Masa trial 30 hari Anda telah berakhir. Upgrade ke paket berbayar untuk melanjutkan penerbitan dokumen — data Anda tetap aman.`
          : `Paket ${PLAN_CATALOG[ent.plan]?.name ?? ent.plan} Anda telah berakhir. Perpanjang langganan untuk melanjutkan.`,
        code: "SUBSCRIPTION_EXPIRED",
        entitlements: ent,
        upgradeUrl: upgradePath,
      },
      { status: 402 }
    );
  }

  return NextResponse.json(
    {
      error: `Kuota dokumen paket Lite terlampaui (${ent.docsUsed}/${ent.docsLimit} bulan ini). Upgrade ke paket Bulanan untuk dokumen tanpa batas.`,
      code: "DOCUMENT_QUOTA_EXCEEDED",
      entitlements: ent,
      upgradeUrl: upgradePath,
    },
    { status: 402 }
  );
}

/** Ringkas entitlement untuk response /api/auth/me & UI */
export function summarizeEntitlements(ent: OrgEntitlements) {
  return {
    plan: ent.plan,
    planName: PLAN_CATALOG[ent.plan]?.name ?? ent.plan,
    status: ent.status,
    docsLimit: ent.docsLimit,
    docsUsed: ent.docsUsed,
    docsRemaining: ent.docsRemaining,
    canPublish: ent.canPublish,
    trialEndsAt: ent.trialEndsAt,
    currentPeriodEnd: ent.currentPeriodEnd,
    daysRemaining: ent.daysRemaining,
  };
}
