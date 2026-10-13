"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Clock3, Loader2, PartyPopper, XCircle } from "lucide-react";

type OrderStatus = "pending" | "active" | "expired" | "cancelled" | "loading" | "notfound";

interface OrderInfo {
  orderId: string;
  planName: string;
  status: string;
  amount: number;
  interval: string;
  paymentType: string | null;
  paidAt: string | null;
  currentPeriodEnd: string | null;
  customerName: string;
}

function formatRupiah(n: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

/**
 * Halaman konfirmasi pembayaran — menutup business flow:
 * Pilih Paket → Checkout → Midtrans Snap → Webhook settlement → HALAMAN INI (polling status).
 */
export default function PembayaranSuksesPage() {
  const [status, setStatus] = useState<OrderStatus>("loading");
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const orderId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("order_id") : null;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!orderId) {
      setStatus("notfound");
      return;
    }

    let alive = true;
    let polls = 0;

    const poll = async () => {
      try {
        const res = await fetch(`/api/subscription/${encodeURIComponent(orderId)}`);
        if (!alive) return;
        if (!res.ok) {
          setStatus("notfound");
          return;
        }
        const json = await res.json();
        if (!json.ok) {
          setStatus("notfound");
          return;
        }
        setOrder(json.order);
        const s = json.order.status as OrderStatus;
        setStatus(s);

        // Berhenti polling setelah lunas/terminal atau setelah ~2 menit
        if (s !== "pending" || polls > 40) {
          if (timerRef.current) clearInterval(timerRef.current);
          return;
        }
      } catch {
        if (alive && polls > 40 && timerRef.current) clearInterval(timerRef.current);
      }
      polls += 1;
    };

    poll();
    timerRef.current = setInterval(poll, 3000);

    return () => {
      alive = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [orderId]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <Image src="/images/brand/nusadoc-symbol.png" alt="Nusadoc" width={855} height={937} className="h-9 w-auto object-contain" />
        <span className="font-display text-[19px] font-bold tracking-tight text-navy">
          Nusa<span className="text-brand">doc</span>
        </span>
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center shadow-card">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand" />
            <h1 className="mt-4 font-display text-[20px] font-bold text-navy">Memeriksa status pembayaran…</h1>
            <p className="mt-2 text-[13.5px] text-slate-500">
              Menunggu konfirmasi dari Midtrans. Halaman ini diperbarui otomatis setiap beberapa detik.
            </p>
          </>
        )}

        {status === "active" && order && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <PartyPopper className="h-7 w-7" />
            </span>
            <h1 className="mt-4 font-display text-[22px] font-bold text-navy">Pembayaran Berhasil!</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
              Terima kasih, {order.customerName}. Langganan <strong className="text-navy">{order.planName}</strong> Anda
              kini aktif.
            </p>
            <dl className="mt-6 space-y-2 rounded-xl border border-line bg-canvas p-4 text-left text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Nomor Order</dt>
                <dd className="tnum font-mono font-semibold text-navy">{order.orderId}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Nilai Dibayar</dt>
                <dd className="tnum font-semibold text-navy">{formatRupiah(order.amount)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Metode</dt>
                <dd className="font-medium capitalize text-navy">{order.paymentType ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Berlaku Sampai</dt>
                <dd className="font-semibold text-navy">
                  {order.currentPeriodEnd ? formatDate(order.currentPeriodEnd) : "Permanen"}
                </dd>
              </div>
            </dl>
            <Link
              href="/login"
              className="btn-sheen mt-6 block rounded-xl bg-brand py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Masuk ke Nusadoc
            </Link>
            <p className="mt-3 text-[11.5px] text-slate-400">
              Aktivasi akun & detail akses dikirim ke email Anda oleh tim PT. SMKarier Inovasi Digital.
            </p>
          </>
        )}

        {status === "pending" && order && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Clock3 className="h-7 w-7" />
            </span>
            <h1 className="mt-4 font-display text-[20px] font-bold text-navy">Menunggu Pembayaran</h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
              Order <span className="font-mono font-semibold text-navy">{order.orderId}</span> belum terkonfirmasi.
              Selesaikan pembayaran pada aplikasi e-wallet / m-banking Anda — status akan diperbarui otomatis.
            </p>
            <p className="mt-3 tnum text-[13px] font-semibold text-navy">
              {order.planName} · {formatRupiah(order.amount)}
            </p>
          </>
        )}

        {(status === "expired" || status === "cancelled") && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <XCircle className="h-7 w-7" />
            </span>
            <h1 className="mt-4 font-display text-[20px] font-bold text-navy">
              {status === "expired" ? "Pembayaran Kedaluwarsa" : "Pembayaran Dibatalkan"}
            </h1>
            <p className="mt-2 text-[13.5px] text-slate-500">
              Transaksi ini tidak diselesaikan. Silakan ulangi checkout dari halaman harga bila masih tertarik.
            </p>
            <Link
              href="/#harga"
              className="mt-6 block rounded-xl bg-navy py-3 text-[14px] font-semibold text-white transition-colors hover:bg-navy-600"
            >
              Kembali ke Halaman Harga
            </Link>
          </>
        )}

        {status === "notfound" && (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <h1 className="mt-4 font-display text-[20px] font-bold text-navy">Order Tidak Ditemukan</h1>
            <p className="mt-2 text-[13.5px] text-slate-500">
              Pastikan Anda membuka tautan konfirmasi yang benar atau hubungi tim kami via WhatsApp.
            </p>
          </>
        )}
      </div>

      <p className="mt-6 text-[11.5px] text-slate-400">
        Butuh bantuan? Email{" "}
        <a href="mailto:admin@smkarier.co.id" className="font-semibold text-brand hover:underline">
          admin@smkarier.co.id
        </a>
      </p>
    </div>
  );
}
