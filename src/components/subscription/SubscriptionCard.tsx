"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, CreditCard, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardHeader, Button } from "@/components/ui/primitives";
import { CheckoutModal } from "./CheckoutModal";
import { PlanKey } from "@/lib/server/midtrans";
import { formatRupiah, formatDateShort } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface SubscriptionData {
  active: boolean;
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
    customerName: string;
    customerEmail: string;
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
  isConfigured: boolean;
}

export function SubscriptionCard() {
  const { user } = useAuth();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("bulanan");

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/subscription/status");
      const json = await res.json();
      if (json.ok) {
        setData(json);
      }
    } catch (err) {
      console.error("Gagal mengambil status langganan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleOpenCheckout = (plan: PlanKey) => {
    setSelectedPlan(plan);
    setModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Status Langganan & Lisensi"
          desc="Dikelola oleh PT. SMKarier Inovasi Digital melalui Midtrans Payment Gateway."
          action={
            <Link href="/langganan" className="text-[12px] font-bold text-brand hover:underline">
              Kelola Paket &amp; Kuota →
            </Link>
          }
        />

        <div className="space-y-4 p-5">
          {loading ? (
            <div className="flex h-24 items-center justify-center text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Memuat status langganan...
            </div>
          ) : data?.active && data.subscription ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-[16px] font-bold text-navy">
                        {data.subscription.planName}
                      </h4>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-emerald-800">
                        Aktif
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-600">
                      Order ID: <span className="font-mono">{data.subscription.orderId}</span> · {data.subscription.customerName}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => handleOpenCheckout(data.subscription?.plan === "hakguna" ? "hakguna" : "bulanan")}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Perpanjang / Upgrade
                </Button>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-emerald-200/70 pt-3 text-[12px] text-slate-600 sm:grid-cols-3">
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Jenis Lisensi</span>
                  <span className="font-medium text-navy">
                    {data.subscription.interval === "lifetime" ? "Hak Guna Selamanya" : "Langganan Cloud Bulanan"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Berlaku Sampai</span>
                  <span className="font-medium text-navy">
                    {data.subscription.currentPeriodEnd
                      ? formatDateShort(data.subscription.currentPeriodEnd.slice(0, 10))
                      : "Permanen / Seumur Hidup"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Nilai Terbayar</span>
                  <span className="font-medium text-navy">{formatRupiah(data.subscription.amount)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-canvas p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-[15px] font-bold text-navy">Paket Demo / Belum Berlangganan</h4>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10.5px] font-medium text-slate-700">
                        Demo
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500">
                      Aktifkan lisensi resmi Nusadoc untuk dokumen komersial perusahaan Anda.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenCheckout("lite")}>
                    Lite (Rp 50 rb)
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleOpenCheckout("bulanan")}>
                    Bulanan (Rp 249 rb)
                  </Button>
                  <Button size="sm" onClick={() => handleOpenCheckout("hakguna")}>
                    Hak Guna
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Histori Pembayaran */}
          {data?.history && data.history.length > 0 && (
            <div className="mt-4">
              <h5 className="text-[12.5px] font-semibold text-navy">Riwayat Transaksi Langganan</h5>
              <div className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line bg-white text-[12px]">
                {data.history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between px-3.5 py-2.5">
                    <div>
                      <p className="font-medium text-navy">{h.planName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {h.orderId} · {formatDateShort(h.createdAt.slice(0, 10))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-navy">{formatRupiah(h.amount)}</p>
                      <span
                        className={`inline-block text-[10.5px] font-semibold uppercase ${
                          h.status === "active"
                            ? "text-emerald-600"
                            : h.status === "pending"
                            ? "text-amber-600"
                            : "text-rose-600"
                        }`}
                      >
                        {h.status === "active" ? "Lunas" : h.status === "pending" ? "Menunggu" : h.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <CheckoutModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        plan={selectedPlan}
        defaultEmail={user?.email || ""}
        defaultName={user?.name || ""}
        onSuccess={() => {
          loadStatus();
        }}
      />
    </>
  );
}
