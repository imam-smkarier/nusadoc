"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Layers,
  Play,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn, formatRupiah } from "@/lib/utils";

type SimulatorStage = "quotation" | "invoice" | "receipt";

interface StageData {
  id: SimulatorStage;
  stepNumber: string;
  tabLabel: string;
  headline: string;
  tagline: string;
  problemSolved: string;
  benefits: string[];
  metricBadge: { label: string; value: string };
  actionLabel: string;
  docDetails: {
    kindLabel: string;
    number: string;
    statusBadge: { text: string; color: string };
    clientName: string;
    subject: string;
    date: string;
    items: Array<{ name: string; qty: number; unit: string; price: number }>;
    ppn: number;
    pph23: number;
    total: number;
    terminLabel?: string;
    paidAmount?: number;
    hashPreview: string;
  };
}

const STAGES: StageData[] = [
  {
    id: "quotation",
    stepNumber: "01",
    tabLabel: "1. Penawaran Cepat",
    headline: "Kirim Proposal Profesional dalam 60 Detik",
    tagline: "Jangan biarkan deal menguap karena Anda lambat menyusun rincian harga.",
    problemSolved:
      "Klien B2B sering membandingkan 2–3 vendor sekaligus. Vendor yang mengirim proposal harga rapi paling cepat adalah yang paling sering memenangkan proyek.",
    benefits: [
      "Pilih klien dari master database, alamat & NPWP terisi instan",
      "Koleksi template item paket jasa tinggal klik tanpa ketik ulang",
      "PPN 11% & PPh 23 dihitung sistem, terbilang rupiah otomatis",
      "Nomor resmi urut atomik (NSD/QUO/...) siap cetak A4 atau kirim PDF",
    ],
    metricBadge: { label: "Waktu Penyusunan", value: "< 60 Detik" },
    actionLabel: "Lihat Transformasi ke Invoice Termin →",
    docDetails: {
      kindLabel: "SURAT PENAWARAN HARGA",
      number: "NSD/QUO/2026/09/001",
      statusBadge: { text: "Disetujui Klien", color: "bg-emerald-50 text-emerald-700 border-emerald-300" },
      clientName: "PT Global Mandiri Nusantara",
      subject: "Pengadaan & Integrasi Sistem Jaringan Kantor Cabang",
      date: "01 Sep 2026",
      items: [
        { name: "Paket Instalasi Jaringan & Router Core", qty: 1, unit: "paket", price: 35_000_000 },
        { name: "Rack Server 24U & Power Distribution", qty: 1, unit: "unit", price: 15_000_000 },
        { name: "Pelatihan & Dokumentasi Administrator", qty: 2, unit: "sesi", price: 2_500_000 },
      ],
      ppn: 6_050_000,
      pph23: 1_100_000,
      total: 59_950_000,
      hashPreview: "e9b5dba5...71374491",
    },
  },
  {
    id: "invoice",
    stepNumber: "02",
    tabLabel: "2. Invoice Multi-Termin",
    headline: "Pecah Termin Proyek Otomatis, Nol Selisih Rupiah",
    tagline: "Sekali klik dari penawaran disetujui — rincian item diskalakan proporsional.",
    problemSolved:
      "Menghitung termin proyek (DP 30%, Progres 50%, Pelunasan 20%) manual di Excel rawan selisih pembulatan. Bagian finance klien korporat akan menahan tagihan jika angka tidak balance.",
    benefits: [
      "1 Penawaran melahirkan banyak termin (DP, Progres, Retensi, Pelunasan)",
      "Nilai item otomatis dikalikan % termin dengan pembulatan rupiah murni",
      "Batas 100% dikunci di server — tidak mungkin over-billing",
      "Nomor invoice mewarisi identitas penawaran (anti-collision)",
    ],
    metricBadge: { label: "Akurasi Finansial", value: "100% Presisi" },
    actionLabel: "Lihat Saat Uang Masuk & Terbit Kwitansi →",
    docDetails: {
      kindLabel: "INVOICE TAGIHAN TERMIN",
      number: "NSD/INV/2026/09/001-T1",
      statusBadge: { text: "Termin 1 (DP 50%)", color: "bg-blue-50 text-brand border-blue-300" },
      clientName: "PT Global Mandiri Nusantara",
      subject: "Pengadaan & Integrasi Sistem Jaringan (Termin DP 50%)",
      date: "05 Sep 2026",
      terminLabel: "Uang Muka (DP) 50% — Ref: NSD/QUO/2026/09/001",
      items: [
        { name: "Paket Instalasi Jaringan (DP 50%)", qty: 1, unit: "paket", price: 17_500_000 },
        { name: "Rack Server 24U (DP 50%)", qty: 1, unit: "unit", price: 7_500_000 },
        { name: "Pelatihan Administrator (DP 50%)", qty: 2, unit: "sesi", price: 1_250_000 },
      ],
      ppn: 3_025_000,
      pph23: 550_000,
      total: 29_975_000,
      hashPreview: "4a7484aa...5cb0a9dc",
    },
  },
  {
    id: "receipt",
    stepNumber: "03",
    tabLabel: "3. Kwitansi Sah & QR",
    headline: "Uang Masuk → Kwitansi Terbit Seketika dengan QR Valid",
    tagline: "Klien scan dari smartphone — dokumen asli diverifikasi seketika di server.",
    problemSolved:
      "Kwitansi manual di kertas sering tercecer, rawan dipalsukan oknum, dan menuntut tanda tangan fisik berulang. Nusadoc mengunci dokumen dengan hash SHA-256 yang mustahil diubah.",
    benefits: [
      "Catat nominal masuk, kwitansi resmi terbit otomatis tanpa ketik ulang",
      "Kwitansi final tidak bisa diedit diam-diam (terkunci dengan audit log)",
      "Status invoice otomatis berubah menjadi LUNAS begitu saldo tercukupi",
      "Otomatis terkirim ke WhatsApp & Email PIC klien",
    ],
    metricBadge: { label: "Keamanan Dokumen", value: "SHA-256 Valid" },
    actionLabel: "Kembali ke Penawaran Awal ↺",
    docDetails: {
      kindLabel: "KWITANSI RESMI PEMBAYARAN",
      number: "NSD/KWT/2026/09/001",
      statusBadge: { text: "LUNAS · DIVERIFIKASI", color: "bg-emerald-50 text-emerald-700 border-emerald-300" },
      clientName: "PT Global Mandiri Nusantara",
      subject: "Pembayaran Uang Muka (DP) 50% Pengadaan Sistem Jaringan",
      date: "08 Sep 2026",
      terminLabel: "Pelunasan Tagihan Invoice No. NSD/INV/2026/09/001-T1",
      items: [
        { name: "Pembayaran diterima via Transfer Bank Mandiri", qty: 1, unit: "transaksi", price: 29_975_000 },
      ],
      ppn: 0,
      pph23: 0,
      total: 29_975_000,
      paidAmount: 29_975_000,
      hashPreview: "f40e3585...106aa070",
    },
  },
];

export function DocumentSimulator() {
  const [activeStage, setActiveStage] = useState<SimulatorStage>("quotation");
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // Auto-advance tabs setiap 7 detik jika user tidak berinteraksi
  useEffect(() => {
    if (!isAutoPlay) return;
    const interval = setInterval(() => {
      setActiveStage((current) => {
        if (current === "quotation") return "invoice";
        if (current === "invoice") return "receipt";
        return "quotation";
      });
    }, 6500);
    return () => clearInterval(interval);
  }, [isAutoPlay]);

  const current = STAGES.find((s) => s.id === activeStage) ?? STAGES[0];

  const handleManualSelect = (id: SimulatorStage) => {
    setIsAutoPlay(false);
    setActiveStage(id);
  };

  const nextStage = () => {
    setIsAutoPlay(false);
    setActiveStage((curr) => {
      if (curr === "quotation") return "invoice";
      if (curr === "invoice") return "receipt";
      return "quotation";
    });
  };

  return (
    <section id="simulasi" className="relative overflow-hidden bg-gradient-to-b from-white via-canvas/60 to-white py-20 lg:py-28">
      {/* Decorative ambient gradients */}
      <div className="pointer-events-none absolute -left-48 top-20 h-96 w-96 rounded-full bg-brand/5 blur-[120px]" />
      <div className="pointer-events-none absolute -right-48 bottom-20 h-96 w-96 rounded-full bg-accent/5 blur-[120px]" />

      <div className="mx-auto max-w-6xl px-5">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            Alur Otomatis Tanpa Rekap Uang Hilang
          </div>
          <h2 className="mt-4 font-display text-[30px] font-bold leading-tight tracking-tight text-navy sm:text-[38px] lg:text-[42px]">
            Lihat Bagaimana 1 Dokumen Mengalir{" "}
            <span className="text-brand">Sampai Uang Masuk ke Rekening</span>
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600 sm:text-[16px]">
            Tidak ada lagi rekap ulang di Excel. Data klien, item, dan pajak berpindah mulus dari
            penawaran harga, tagihan termin, hingga kwitansi ber-QR resmi.
          </p>
        </div>

        {/* Stage Selector Tabs */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-line bg-white p-2 shadow-sm sm:gap-3">
            {STAGES.map((s) => {
              const active = s.id === activeStage;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleManualSelect(s.id)}
                  className={cn(
                    "relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all duration-300 sm:px-5 sm:text-[14px]",
                    active
                      ? "bg-navy text-white shadow-md shadow-navy/20"
                      : "text-slate-600 hover:bg-canvas hover:text-navy"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      active ? "bg-brand text-white" : "bg-slate-200 text-slate-700"
                    )}
                  >
                    {s.stepNumber}
                  </span>
                  <span>{s.tabLabel}</span>
                  {active && (
                    <motion.div
                      layoutId="activeTabBadge"
                      className="absolute inset-0 -z-10 rounded-xl bg-navy"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Showcase Box */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-line bg-white shadow-xl shadow-slate-200/50 lg:mt-12">
          <div className="grid grid-cols-1 items-stretch lg:grid-cols-12">
            {/* Left Column: Commercial Storytelling & Benefits (5 cols) */}
            <div className="flex flex-col justify-between border-b border-line bg-panel p-7 sm:p-9 lg:col-span-5 lg:border-b-0 lg:border-r">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-display text-[12px] font-bold uppercase tracking-[0.2em] text-brand">
                    Langkah {current.stepNumber} dari 03
                  </span>
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {current.metricBadge.label}: {current.metricBadge.value}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.28 }}
                  >
                    <h3 className="mt-3 font-display text-[22px] font-bold leading-tight text-navy sm:text-[25px]">
                      {current.headline}
                    </h3>
                    <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-slate-500">
                      {current.tagline}
                    </p>

                    <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-[12.5px] leading-relaxed text-amber-900">
                      <strong className="font-semibold text-amber-950">Masalah Lapangan: </strong>
                      {current.problemSolved}
                    </div>

                    <ul className="mt-5 space-y-2.5">
                      {current.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2.5 text-[13px] text-slate-700">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-8 border-t border-line pt-6">
                <button
                  type="button"
                  onClick={nextStage}
                  className="btn-sheen group flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-navy-600 sm:text-[14px]"
                >
                  <span>{current.actionLabel}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <p className="mt-2.5 text-center text-[11px] text-slate-400">
                  Klik tombol untuk melihat bagaimana data otomatis mengalir tanpa ketik ulang.
                </p>
              </div>
            </div>

            {/* Right Column: Live Interactive Document Sheet Simulation (7 cols) */}
            <div className="relative flex flex-col justify-center bg-canvas/60 p-5 sm:p-8 lg:col-span-7">
              {/* Document Sheet Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -15 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className="relative mx-auto w-full max-w-[540px] rounded-2xl border border-line bg-white p-6 shadow-sheet sm:p-7"
                >
                  {/* Stamp / Status Ribbon */}
                  <div className="flex items-start justify-between border-b border-line pb-4">
                    <div className="flex items-center gap-3">
                      <Image
                        src="/images/brand/nusadoc-symbol.png"
                        alt="Nusadoc"
                        width={855}
                        height={937}
                        className="h-9 w-auto object-contain"
                      />
                      <div>
                        <p className="font-display text-[15px] font-bold text-navy leading-none">
                          PT. Nusadoc Solusi Digital
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">
                          {current.docDetails.kindLabel}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
                        current.docDetails.statusBadge.color
                      )}
                    >
                      {current.docDetails.statusBadge.text}
                    </span>
                  </div>

                  {/* Metadata Header */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Ditujukan Kepada:
                      </span>
                      <p className="font-semibold text-navy mt-0.5">{current.docDetails.clientName}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">PIC: Bpk. Hendra Saputra</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Nomor Resmi &amp; Tanggal:
                      </span>
                      <p className="font-mono font-bold text-navy mt-0.5 text-[12.5px]">
                        {current.docDetails.number}
                      </p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Tgl: {current.docDetails.date}</p>
                    </div>
                  </div>

                  {/* Termin Reference Note (If applicable) */}
                  {current.docDetails.terminLabel && (
                    <div className="mt-3 rounded-lg border border-line/80 bg-canvas px-3 py-1.5 text-[11.5px] font-medium text-slate-600">
                      ℹ️ {current.docDetails.terminLabel}
                    </div>
                  )}

                  {/* Simulated Line Item Table */}
                  <div className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
                    <table className="w-full text-left text-[11.5px]">
                      <thead className="border-b border-line bg-canvas/80 font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Rincian Item</th>
                          <th className="py-2 px-2 text-center">Qty</th>
                          <th className="py-2 px-3 text-right">Nilai (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {current.docDetails.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-medium text-navy">{it.name}</td>
                            <td className="py-2 px-2 text-center text-slate-500">
                              {it.qty} {it.unit}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-medium text-navy">
                              {formatRupiah(it.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations & Totals Panel */}
                  <div className="mt-3 flex justify-end">
                    <div className="w-full max-w-[240px] space-y-1 text-[11.5px]">
                      {current.docDetails.ppn > 0 && (
                        <div className="flex justify-between text-slate-500">
                          <span>PPN (11%):</span>
                          <span className="font-mono">{formatRupiah(current.docDetails.ppn)}</span>
                        </div>
                      )}
                      {current.docDetails.pph23 > 0 && (
                        <div className="flex justify-between text-slate-500">
                          <span>PPh 23 (2% potong):</span>
                          <span className="font-mono text-rose-600">
                            - {formatRupiah(current.docDetails.pph23)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-line pt-1 text-[13px] font-bold text-navy">
                        <span>Total Tagihan:</span>
                        <span className="font-mono text-brand">
                          {formatRupiah(current.docDetails.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Anti-Tamper Security Footer (QR + Hash) */}
                  <div className="mt-4 flex items-center justify-between border-t border-line/80 pt-3 text-[11px]">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg border border-line bg-white p-1 shadow-sm">
                        <QRCodeSVG
                          value={`https://nusadoc.id/v/demo-${current.id}`}
                          size={40}
                          level="M"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-navy flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          QR Verifikasi Publik
                        </p>
                        <p className="font-mono text-[10px] text-slate-400">
                          Hash: {current.docDetails.hashPreview}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                      Terkunci SHA-256
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
