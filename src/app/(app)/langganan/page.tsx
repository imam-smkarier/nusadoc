"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  FileText,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Card, CardHeader, Button } from "@/components/ui/primitives";
import { CheckoutModal } from "@/components/subscription/CheckoutModal";
import { useAuth } from "@/lib/auth";
import { PLAN_CATALOG, CHECKOUT_PLANS, formatPlanPrice, PlanId } from "@/lib/plans";
import type { PlanKey } from "@/lib/server/midtrans";
import { formatRupiah, formatDateShort } from "@/lib/utils";

interface SubscriptionStatusData {
  active: boolean;
  entitlements: {
    plan: PlanId;
    planName: string;
    status: "active" | "trial" | "expired";
    docsLimit: number | null;
    docsUsed: number;
    docsRemaining: number | null;
    canPublish: boolean;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    daysRemaining: number | null;
  } | null;
  subscription: {
    id: string;
    orderId: string;
    plan: string;
    planName: string;
    status: string;
    amount: number;
    interval: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    paidAt: string | null;
  } | null;
  history: Array<{
    id: string;
    orderId: string;
    plan: string;
    planName: string;
    status: string;
    amount: number;
    interval: string;
    paidAt: string | null;
    createdAt: string;
  }>;
}

export default function LanggananPage() {
  const { user, organization, refreshAuth } = useAuth();
  const [data, setData] = useState<SubscriptionStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("lite");

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/subscription/status");
      const json = await res.json();
      if (json.ok) {
        setData(json);
      }
    } catch {
      // offline / api error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const openCheckout = (plan: PlanKey) => {
    setSelectedPlan(plan);
    setModalOpen(true);
  };

  const ent = data?.entitlements ?? organization ?? null;
  const currentPlanMeta = ent ? PLAN_CATALOG[ent.plan as PlanId] : null;

  return (
    <>
      <PageHeader
        title="Paket &amp; Langganan"
        desc="Kelola kuota penerbitan dokumen, masa aktif, dan upgrade paket bisnis Anda."
      />

      <div className="space-y-6 p-5 lg:p-7">
        {/* ═══ KARTU STATUS PAKET AKTIF & KUOTA DOKUMEN ═══ */}
        <Card className="overflow-hidden border-line">
          <div className="bg-gradient-to-r from-navy-900 to-navy-800 p-6 text-white sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand">
                  <Sparkles className="h-3 w-3 text-accent" />
                  Workspace: {organization?.name ?? "Perusahaan Saya"}
                </div>
                <h3 className="mt-2 font-display text-[26px] font-bold leading-tight">
                  Paket {currentPlanMeta?.name ?? "Trial 30 Hari"}
                </h3>
                <p className="mt-1 text-[13px] text-slate-300">
                  {currentPlanMeta?.tagline ?? "Masa uji coba gratis."}
                </p>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11.5px] font-bold uppercase tracking-wider ${
                    ent?.status === "active"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : ent?.status === "trial"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                  {ent?.status === "active"
                    ? "Aktif"
                    : ent?.status === "trial"
                      ? "Masa Trial"
                      : "Kedaluwarsa (Read-Only)"}
                </span>

                {ent?.daysRemaining !== null && ent?.daysRemaining !== undefined && (
                  <p className="mt-1.5 text-[11.5px] text-slate-300 flex items-center justify-end gap-1">
                    <Clock className="h-3.5 w-3.5 text-accent" />
                    Sisa {ent.daysRemaining} hari lagi
                  </p>
                )}
              </div>
            </div>

            {/* Meter Penggunaan Dokumen (Khusus Paket Kuota / Lite) */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand" />
                  Penggunaan Dokumen Bulan Ini:
                </span>
                <span className="font-mono font-bold text-white">
                  {ent?.docsUsed ?? 0}
                  {ent?.docsLimit ? ` / ${ent.docsLimit}` : " / Unlimited"} dokumen
                </span>
              </div>

              {/* Progress bar */}
              {Boolean(ent?.docsLimit) && (
                <div className="mt-2.5">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (ent?.docsUsed ?? 0) >= (ent?.docsLimit ?? 25)
                          ? "bg-rose-500"
                          : (ent?.docsUsed ?? 0) >= (ent?.docsLimit ?? 25) * 0.8
                            ? "bg-amber-400"
                            : "bg-brand"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round(((ent?.docsUsed ?? 0) / (ent?.docsLimit ?? 25)) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
                    <span>Tersisa {ent?.docsRemaining ?? 0} dokumen lagi</span>
                    <span>Reset tiap awal bulan kalender</span>
                  </div>
                </div>
              )}
            </div>

            {/* Warning Alert if Expired */}
            {ent?.status === "expired" && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[12.5px] text-rose-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>
                  Akun Anda saat ini berstatus <strong>Read-Only</strong>. Seluruh data historis tetap aman
                  dan dapat dicetak, tetapi penerbitan dokumen baru dinonaktifkan sampai Anda mengaktifkan paket berbayar.
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* ═══ PILIHAN PAKET UPGRADE (LITE, BULANAN, HAK GUNA) ═══ */}
        <div>
          <div className="mb-4">
            <h4 className="font-display text-[18px] font-bold text-navy">Pilihan Paket Langganan</h4>
            <p className="text-[13px] text-slate-500">
              Upgrade langsung aktif seketika setelah pembayaran Midtrans (QRIS, VA Bank, Kartu Kredit).
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {CHECKOUT_PLANS.map((planId) => {
              const p = PLAN_CATALOG[planId];
              const priceFormatted = formatPlanPrice(p.priceIdr);
              const isCurrent = ent?.plan === planId && ent?.status === "active";

              return (
                <div
                  key={planId}
                  className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-200 ${
                    planId === "lite"
                      ? "border-emerald-300 bg-emerald-50/20 shadow-sm"
                      : planId === "bulanan"
                        ? "border-brand bg-brand-soft/20 shadow-md ring-1 ring-brand/30"
                        : "border-line bg-white shadow-sm hover:border-slate-300"
                  }`}
                >
                  {p.badge && (
                    <span className="absolute -top-3 right-5 rounded-full bg-brand px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                      {p.badge}
                    </span>
                  )}

                  <div>
                    <div className="flex items-baseline justify-between">
                      <h5 className="font-display text-[18px] font-bold text-navy">{p.name}</h5>
                    </div>
                    <p className="mt-1 text-[12px] text-slate-500">{p.tagline}</p>

                    <div className="my-4 border-y border-line/60 py-3">
                      <span className="font-display text-[26px] font-bold text-navy">
                        {priceFormatted.price}
                      </span>
                      <span className="ml-1 text-[12px] font-medium text-slate-500">
                        {priceFormatted.unit}
                      </span>
                    </div>

                    <ul className="space-y-2 text-[12.5px] text-slate-600">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4 border-t border-line/60">
                    {isCurrent ? (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 text-center text-[13px] font-bold text-emerald-700">
                        ✓ Paket Sedang Aktif
                      </div>
                    ) : (
                      <Button
                        variant={planId === "bulanan" ? "primary" : "outline"}
                        onClick={() => openCheckout(planId as PlanKey)}
                        className="w-full font-bold"
                      >
                        Pilih {p.name}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ RIWAYAT TRANSAKSI ═══ */}
        {data?.history && data.history.length > 0 && (
          <Card>
            <CardHeader
              title="Riwayat Pembayaran"
              desc="Daftar tagihan paket langganan yang pernah dibuat di workspace ini."
            />
            <div className="divide-y divide-line p-0 text-[12.5px]">
              {data.history.map((h) => (
                <div key={h.id} className="flex items-center justify-between px-6 py-3.5">
                  <div>
                    <p className="font-semibold text-navy">{h.planName}</p>
                    <p className="text-[11px] font-mono text-slate-400">
                      Order: {h.orderId} · {formatDateShort(h.createdAt.slice(0, 10))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-navy">{formatRupiah(h.amount)}</p>
                    <span
                      className={`inline-block text-[10px] font-bold uppercase ${
                        h.status === "active"
                          ? "text-emerald-600"
                          : h.status === "pending"
                            ? "text-amber-600"
                            : "text-rose-500"
                      }`}
                    >
                      {h.status === "active" ? "Lunas" : h.status === "pending" ? "Menunggu" : h.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <CheckoutModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        plan={selectedPlan}
        defaultEmail={user?.email || ""}
        defaultName={user?.name || ""}
        onSuccess={() => {
          void loadStatus();
          void refreshAuth();
        }}
      />
    </>
  );
}
