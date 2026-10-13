"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CreditCard, Loader2, MessageCircle, ShieldCheck, X } from "lucide-react";
import { SUBSCRIPTION_PLANS, PlanKey } from "@/lib/server/midtrans";
import { useMidtransSnap } from "@/lib/useMidtransSnap";
import { formatRupiah } from "@/lib/utils";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  plan: PlanKey | null;
  defaultEmail?: string;
  defaultName?: string;
  onSuccess?: (orderId: string) => void;
}

export function CheckoutModal({
  open,
  onClose,
  plan,
  defaultEmail = "",
  defaultName = "",
  onSuccess,
}: CheckoutModalProps) {
  const { openSnap } = useMidtransSnap();
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useState(() => {
    if (defaultName) setName(defaultName);
    if (defaultEmail) setEmail(defaultEmail);
  });

  if (!open || !plan) return null;

  const planMeta = SUBSCRIPTION_PLANS[plan];
  const waMessage = encodeURIComponent(
    `Halo PT. SMKarier Inovasi Digital, saya tertarik berlangganan Nusadoc paket ${planMeta.name}. Boleh dibantu prosesnya?`
  );
  const waUrl = `https://wa.me/6281213582508?text=${waMessage}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          customerName: name,
          customerEmail: email,
          customerPhone: phone || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Gagal membuat sesi pembayaran Midtrans");
      }

      onClose();

      openSnap(data.token, data.redirectUrl, {
        onSuccess: () => {
          // Business flow: Midtrans settlement → webhook → halaman konfirmasi (polling status)
          router.push(`/pembayaran/sukses?order_id=${encodeURIComponent(data.orderId)}`);
        },
        onPending: () => {
          // Status pending juga diarahkan — halaman sukses mem-polling sampai webhook masuk
          router.push(`/pembayaran/sukses?order_id=${encodeURIComponent(data.orderId)}`);
        },
        onError: () => {
          alert("Terjadi kendala saat pembayaran. Silakan coba kembali.");
        },
        onClose: () => {
          // Pengguna menutup popup tanpa membayar — tetap di halaman
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-panel p-6 shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy"
            title="Tutup"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">
                Pembayaran Online Midtrans
              </p>
              <h3 className="font-display text-[19px] font-bold text-navy">
                Langganan {planMeta.name}
              </h3>
            </div>
          </div>

          {/* Plan Summary Card */}
          <div className="mt-4 rounded-xl border border-line bg-canvas p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-[13px] font-semibold text-navy">{planMeta.name}</p>
                <p className="text-[11.5px] text-slate-500">{planMeta.description}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-[18px] font-bold text-navy">
                  {formatRupiah(planMeta.amount)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {planMeta.interval === "monthly" ? "/ bulan" : "sekali bayar"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-line/60 pt-2.5 text-[11px] text-slate-600">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Didukung oleh PT. SMKarier Inovasi Digital · Midtrans Payment Gateway</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            {error && (
              <div className="rounded-lg bg-rose-50 p-3 text-[12px] font-medium text-rose-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[12px] font-medium text-slate-700">Nama Lengkap / PIC</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="mt-1 w-full rounded-lg border border-line bg-white px-3.5 py-2 text-[13.5px] text-navy placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-700">Alamat Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="budi@perusahaan.co.id"
                className="mt-1 w-full rounded-lg border border-line bg-white px-3.5 py-2 text-[13.5px] text-navy placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Bukti pembayaran dan akses akun akan dikirimkan ke email ini.
              </p>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-700">
                Nomor WhatsApp / HP <span className="text-slate-400">(opsional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="081234567890"
                className="mt-1 w-full rounded-lg border border-line bg-white px-3.5 py-2 text-[13.5px] text-navy placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="rounded-lg border border-line/70 bg-white p-3 text-[11.5px] text-slate-600">
              <p className="font-semibold text-navy">Metode Pembayaran Tersedia:</p>
              <p className="mt-0.5 text-slate-500">
                QRIS (GoPay, OVO, Dana, ShopeePay), Transfer Bank (BCA, Mandiri, BNI, BRI), dan Kartu Kredit.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-sheen flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menghubungkan ke Midtrans...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Lanjut ke Pembayaran Midtrans
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Alternative WhatsApp link */}
          <div className="mt-4 border-t border-line pt-3 text-center">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 hover:text-navy"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
              Butuh konsultasi faktur pajak atau invoice manual? Chat Tim via WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
