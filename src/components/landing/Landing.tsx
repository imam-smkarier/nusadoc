"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Barcode,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Landmark,
  Layers,
  MailCheck,
  MessageCircle,
  Play,
  Printer,
  QrCode,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stamp,
  Users,
} from "lucide-react";
import { DocPreview } from "@/components/documents/DocumentSheet";
import { InvoiceSheet } from "@/components/documents/InvoiceSheet";
import { DocumentSimulator } from "@/components/landing/DocumentSimulator";
import { InteractiveQrDemo } from "@/components/landing/InteractiveQrDemo";
import { CheckoutModal } from "@/components/subscription/CheckoutModal";
import LogoCloudSwap from "@/components/ui/logo-clouds";
import type { PlanKey } from "@/lib/server/midtrans";
import { seedSettings } from "@/lib/seed";
import type { Client, CompanySettings, Invoice, Payment } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ══════════════════ Konten & Copywriting Bisnis ══════════════════ */

const WA_NUMBER = "6281213582508";
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Halo PT. SMKarier Inovasi Digital, saya tertarik dengan Nusadoc. Boleh info lebih lanjut?")}`;

const PRICING = [
  {
    id: "lite",
    name: "Lite",
    tagline: "Paling hemat untuk usaha yang baru mulai tertib. Pas untuk freelancer & UMKM.",
    price: "Rp 50",
    unit: "rb / bulan",
    cta: "Mulai Lite",
    badge: "Termurah",
    roiNote: "Hanya ~Rp 1.600 / hari",
    features: [
      "25 dokumen / bulan (penawaran + invoice + kwitansi)",
      "QR verifikasi publik & hash SHA-256",
      "Multi-termin proyek & pajak otomatis",
      "1 pengguna (pemilik bisnis)",
      "Dukungan via email",
    ],
  },
  {
    id: "bulanan",
    name: "Bulanan",
    tagline: "Langsung aktif di cloud dalam 2 menit. Mulai cepat tanpa urusan teknis server.",
    price: "Rp 249",
    unit: "rb / bulan",
    cta: "Mulai Sekarang",
    badge: "Paling Populer",
    roiNote: "Hanya ~Rp 8.300 / hari",
    features: [
      "Dokumen tanpa batas (Penawaran, Invoice, Kwitansi)",
      "QR verifikasi publik & hash SHA-256",
      "Multi-termin proyek (DP, Progres, Pelunasan)",
      "Kirim otomatis ke WhatsApp & Email PIC klien",
      "3 pengguna akses (Admin, Finance, Sales)",
      "Pembaruan otomatis di cloud & backup harian",
    ],
  },
  {
    id: "hakguna",
    name: "Hak Guna",
    tagline: "Terpasang di server Anda sendiri. Sekali bayar, milik selamanya tanpa iuran.",
    price: "Rp 19,9",
    unit: "jt sekali bayar",
    cta: "Ambil Hak Guna",
    badge: "Paling Dipilih",
    roiNote: "Investasi aset 1x selamanya",
    features: [
      "Seluruh fitur paket Bulanan tanpa batasan",
      "Pengguna tanpa batas (unlimited team users)",
      "100% data tersimpan di server / VPS milik Anda",
      "Bebas biaya langganan bulanan selamanya",
      "Pembaruan resmi 1 tahun penuh + pendampingan setup",
      "Garansi implementasi 90 hari uang kembali",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Multi-perusahaan, custom integrasi ERP, atau lisensi reseller white-label.",
    price: "Hubungi",
    unit: "kami",
    cta: "Diskusi Kebutuhan",
    badge: undefined,
    roiNote: "Solusi skala korporat",
    features: [
      "Multi-cabang & multi-entitas PT/CV dalam 1 portal",
      "Integrasi payment gateway (Midtrans) & sistem accounting",
      "White-label khusus konsultan & software agency",
      "Dedicated server setup & migrasi data custom",
      "SLA respons prioritas & pendampingan khusus",
    ],
  },
];

/* Dokumen contoh untuk hero showcase */
const heroClient: Client = {
  id: "hero",
  code: "CL-021",
  name: "CV Karya Mandiri Sejahtera",
  address: "Jl. Industri Raya No. 45",
  city: "Bekasi",
  npwp: "03.555.777.8-221.000",
  picName: "Bpk. Dedi Kurniawan",
  picPhone: "+62 812-9000-1122",
  picEmail: "dedi@karyamandiri.co.id",
  createdAt: "2026-01-10",
};

const heroInvoice: Invoice = {
  id: "hero",
  kind: "invoice",
  number: "NSD/INV/2026/09/001-T1",
  seq: 1,
  terminIndex: 1,
  terminLabel: "Uang Muka (DP) 50%",
  terminPct: 50,
  clientId: "hero",
  subject: "Instalasi Jaringan & Server — Kantor Pusat Baru",
  date: "2026-09-01",
  dueDate: "2026-09-16",
  items: [
    { id: "h1", name: "Instalasi jaringan & access point", description: "48 titik, kabel Cat6, testing & dokumentasi", qty: 1, unit: "paket", unitPrice: 42_000_000 },
    { id: "h2", name: "Server rack 12U & konfigurasi", description: "1 unit, termasuk UPS dan labelling", qty: 1, unit: "unit", unitPrice: 18_500_000 },
    { id: "h3", name: "Pelatihan admin IT", description: "On-site di kantor klien", qty: 2, unit: "sesi", unitPrice: 2_500_000 },
  ],
  tax: { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
  notes: "",
  token: "NSD-XXXX-XXXX-XXXX",
  hash: "e3b0c442...98fc1c14",
  issuedAt: "2026-09-01T09:00:00.000Z",
};

const heroPayments: Payment[] = [
  { id: "pay-hero", invoiceId: "hero", date: "2026-09-10", amount: 72_705_000, method: "Transfer Bank", receiptId: "rcp-hero" },
];

const heroSettings: CompanySettings = seedSettings;

const USE_CASES = [
  "Kontraktor & System Integrator",
  "IT & Software House",
  "Konsultan & Bisnis Jasa",
  "Distributor & Supplier B2B",
  "Agensi Kreatif & Event Organizer",
  "Klinik, Kantor & Yayasan",
];

/* ══════════════════ Util & Animasi ══════════════════ */

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.05 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const heroItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">{children}</p>;
}

function HeroDocTilt({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useTransform(y, [-180, 180], [4, -4]);
  const ry = useTransform(x, [-180, 180], [-4, 4]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        x.set(e.clientX - (rect.left + rect.width / 2));
        y.set(e.clientY - (rect.top + rect.height / 2));
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      className="transition-transform duration-200 ease-out"
    >
      {children}
    </motion.div>
  );
}

function SpotlightCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setCoords({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseLeave={() => setCoords(null)}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-line bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-card",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: coords
            ? `radial-gradient(320px circle at ${coords.x}px ${coords.y}px, rgba(8, 126, 212, 0.16), transparent 70%)`
            : "none",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ══════════════════ Halaman Utama Landing ══════════════════ */

export default function Landing() {
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);

  return (
    <MotionConfig reducedMotion="never">
      <div className="min-h-dvh bg-white selection:bg-brand selection:text-white">
        <Navbar />
        <Hero />
        <Problems />
        <DocumentSimulator />
        <TurningPoint />
        <Features />
        <HowItWorks />
        <QrShowcase />
        <Pricing onSelectPlan={setSelectedPlan} />
        <Guarantee />
        <Faq />
        <FinalCta />
        <PaymentChannels />
        <Footer />

        <CheckoutModal
          open={Boolean(selectedPlan)}
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
        />
      </div>
    </MotionConfig>
  );
}

/* ── Navbar ── */

function Navbar() {
  const { scrollYProgress } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-md transition-all duration-300",
        scrolled ? "border-line bg-white/95 shadow-sm" : "border-transparent bg-white/80"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/brand/nusadoc-symbol.png"
            alt="Nusadoc"
            width={855}
            height={937}
            className="h-8 w-auto object-contain"
            priority
          />
          <span className="font-display text-[19px] font-bold tracking-tight text-navy">
            Nusa<span className="text-brand">doc</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {[
            ["Kenapa Nusadoc", "#kenapa"],
            ["Simulasi Alur", "#simulasi"],
            ["Fitur", "#fitur"],
            ["Harga", "#harga"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <a key={href} href={href} className="text-[13.5px] font-medium text-slate-600 transition-colors hover:text-navy">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <Link href="/login" className="hidden rounded-lg px-3.5 py-2 text-[13.5px] font-semibold text-navy transition-colors hover:bg-canvas sm:block">
            Masuk
          </Link>
          <Link href="/daftar" className="btn-sheen inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark">
            Coba Gratis 30 Hari <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ── Hero — Copywriting B2B Bertarget ── */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[540px] w-[540px] rounded-full bg-brand/[0.07] blur-[110px]" />
      <div className="pointer-events-none absolute -left-32 top-1/2 h-80 w-80 rounded-full bg-accent/[0.05] blur-[90px]" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.08fr_0.92fr] lg:pb-24 lg:pt-20">
        <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }}>
          <motion.span variants={heroItem} className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-soft px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
            <Stamp className="h-3.5 w-3.5" />
            Software Dokumen Komersial &amp; Termin B2B
          </motion.span>

          <motion.h1 variants={heroItem} className="mt-5 font-display text-[36px] font-bold leading-[1.08] tracking-tight text-navy sm:text-[46px] lg:text-[50px]">
            Tutup Deal Lebih Cepat.{" "}
            <span className="text-brand">Tagih Termin Tanpa Canggung.</span>{" "}
            Bebas Kwitansi Palsu.
          </motion.h1>

          <motion.p variants={heroItem} className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-slate-600 sm:text-[16px]">
            Dari penawaran harga presisi dalam 60 detik, invoice termin bertahap (DP/progres/pelunasan)
            dengan nol selisih rupiah, hingga kwitansi sah ber-QR verifikasi publik.
            Satu alur tertib yang melindungi cash flow dan reputasi bisnis Anda di depan klien.
          </motion.p>

          <motion.div variants={heroItem} className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link href="/daftar" className="btn-sheen group inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-[15px] font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark">
              Mulai Trial 30 Hari Gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#simulasi" className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-white px-6 text-[15px] font-semibold text-navy transition-colors hover:border-brand/50 hover:bg-canvas">
              <Play className="h-4 w-4 text-brand" /> Simulasi Alur
            </a>
          </motion.div>

          {/* Micro-trust proof badges */}
          <motion.div variants={heroItem} className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Nol Selisih Rupiah
            </span>
            <span className="flex items-center gap-1.5">
              <QrCode className="h-4 w-4 text-brand" /> QR Verifikasi Publik
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-600" /> Terbit &lt; 2 Menit
            </span>
          </motion.div>
        </motion.div>

        {/* 3D Interactive Hero Preview */}
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }} className="relative">
          <HeroDocTilt>
            <div className="relative mx-auto max-w-[560px]">
              <div className="relative max-h-[540px] overflow-hidden rounded-2xl shadow-sheet border border-line/60">
                <DocPreview maxScale={0.72}>
                  <InvoiceSheet invoice={heroInvoice} client={heroClient} settings={heroSettings} payments={heroPayments} />
                </DocPreview>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-transparent" />
              </div>

              <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.9 }} className="absolute -right-3 top-10 flex items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 shadow-pop sm:-right-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <BadgeCheck className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[12.5px] font-bold text-navy">Terbayar · Lunas</span>
                  <span className="block text-[11px] text-slate-400">status kalkulatif otomatis</span>
                </span>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18, delay: 1.2 }} className="absolute -left-3 bottom-14 flex items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 shadow-pop sm:-left-8">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <QrCode className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[12.5px] font-bold text-navy">QR Publik &amp; SHA-256</span>
                  <span className="block text-[11px] text-slate-400">dipindai instan tanpa login</span>
                </span>
              </motion.div>
            </div>
          </HeroDocTilt>
        </motion.div>
      </div>

      {/* Marquee Industry Badges */}
      <div className="marquee-mask overflow-hidden border-t border-line/70 bg-canvas/60 py-3.5">
        <div className="animate-marquee-x flex w-max items-center gap-10 px-5">
          {[0, 1].map((dup) => (
            <div key={dup} aria-hidden={dup === 1} className="flex items-center gap-10">
              <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Dirancang Khusus Untuk
              </span>
              {USE_CASES.map((k) => (
                <span key={k} className="flex items-center gap-2.5 whitespace-nowrap text-[13px] font-semibold text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  {k}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Masalah Lapangan yang Mengena ── */

const PROBLEMS = [
  {
    title: "Kalkulasi termin proyek rumit & sering selisih rupiah",
    body: "DP 30%, progres 40%, pelunasan 30% dihitung manual di Excel. Satu baris salah hitung PPN 11% atau selisih pembulatan, bagian finance klien korporat langsung menahan pembayaran dan minta revisi berlarut-larut.",
    loss: "Dampak: Pembayaran tertahan 14–30 hari hanya karena format dokumen.",
  },
  {
    title: "Sungkan dan canggung menagih klien via chat pribadi",
    body: "Menagih via chat WhatsApp personal sering terkesan mendesak dan canggung. Klien beralasan invoice belum diterima atau terselip di email. Penagihan tertunda, sementara cash flow operasional Anda yang tercekik.",
    loss: "Dampak: Piutang usaha menumpuk, gaji tim terancam telat.",
  },
  {
    title: "Dokumen manual rawan dipalsukan & diragukan klien B2B",
    body: "File Word atau PDF biasa sangat gampang diedit nominalnya oleh oknum. Klien korporat & BUMN menahan pencairan karena curiga dokumen fiktif. Reputasi bisnis Anda dipertaruhkan hanya karena dokumen tidak berverifikasi resmi.",
    loss: "Dampak: Kredibilitas bisnis jatuh di mata klien institusi besar.",
  },
];

function Problems() {
  return (
    <section id="kenapa" className="bg-canvas/70 py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Eyebrow>Realitas Lapangan</Eyebrow>
          <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight text-navy sm:text-[34px]">
            Tiga Kebocoran Waktu &amp; Kas yang Sering Dialami Bisnis B2B
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
            Sebagian besar piutang macet bukan karena klien tidak punya dana — melainkan karena alur
            administrasi dokumen yang berantakan dan menimbulkan keraguan.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <motion.div
              key={p.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="group flex flex-col justify-between rounded-2xl border border-line bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-pop"
            >
              <div>
                <span className="tnum font-display text-[28px] font-bold text-brand/25 transition-colors group-hover:text-brand/60">
                  0{i + 1}
                </span>
                <h3 className="mt-3 text-[16.5px] font-bold leading-snug text-navy">{p.title}</h3>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-slate-500">{p.body}</p>
              </div>
              <div className="mt-5 rounded-lg border border-rose-100 bg-rose-50/70 p-2.5 text-[12px] font-medium text-rose-700">
                {p.loss}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Turning point ── */

function TurningPoint() {
  return (
    <section className="relative overflow-hidden bg-navy py-20 lg:py-24">
      <motion.div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand/20 blur-[100px]" animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <motion.div {...fadeUp}>
          <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-brand">Saatnya Beralih ke Sistem yang Tertib</p>
          <h2 className="mt-4 font-display text-[30px] font-bold leading-tight text-white sm:text-[38px]">
            Proyek selesai. Tagihan termin terbit rapi.
            <br />
            <span className="text-brand">Klien scan QR — langsung yakin dan bayar tepat waktu.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[15.5px] leading-relaxed text-slate-300">
            Tidak ada lagi selisih rupiah. Tidak ada drama telepon konfirmasi &ldquo;Apakah ini kwitansi resmi?&rdquo;.
            Semua penawaran, invoice bertahap, dan bukti pembayaran tersimpan rapi, terlindungi hash SHA-256,
            dan siap diaudit kapan pun dibutuhkan.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/login" className="btn-sheen inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-7 text-[15px] font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:bg-brand-dark">
              Coba Demo Gratis Sekarang <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Fitur — Value Props Nyata ── */

const FEATURES = [
  {
    icon: Layers,
    title: "Multi-termin otomatis, nol selisih",
    body: "Satu penawaran melahirkan banyak termin — DP, progres, retensi, pelunasan — dengan nilai item diskalakan proporsional dan batas 100% terkunci aman.",
  },
  {
    icon: QrCode,
    title: "QR verifikasi publik & hash SHA-256",
    body: "Setiap dokumen membawa QR unik yang membuka halaman validasi resmi server Anda. Tanpa login, tanpa aplikasi — kamera HP membuktikan keaslian seketika.",
  },
  {
    icon: Landmark,
    title: "Kalkulasi pajak & terbilang presisi",
    body: "PPN 11%, PPh 23, dan ejaan terbilang rupiah dihitung otomatis dari sumber data yang sama. Bebas salah ketik dan bebas komplain bagian finance klien.",
  },
  {
    icon: MailCheck,
    title: "Kirim otomatis ke Email & WhatsApp",
    body: "Begitu diterbitkan, dokumen langsung terkirim otomatis ke email dan WhatsApp PIC klien, lengkap dengan tautan verifikasi resmi.",
  },
  {
    icon: Printer,
    title: "Format A4 hemat tinta kantor",
    body: "Layout profesional monokrom dengan aksen tipis, tanpa blok warna gelap luas. Mencetak 50 lembar kwitansi tidak akan menguras cartridge printer.",
  },
  {
    icon: Users,
    title: "Multi-user & hak akses berjenjang",
    body: "Sales membuat penawaran, finance menerbitkan invoice & mencatat bayar, direksi menyetujui. Setiap peran tertata rapi dengan audit log lengkap.",
  },
];

function Features() {
  return (
    <section id="fitur" className="bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Eyebrow>Fitur Pengaman Bisnis</Eyebrow>
          <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight text-navy sm:text-[34px]">
            Dirancang untuk Kelancaran Kas &amp; Integritas Operasional
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
            Nusadoc menghubungkan seluruh siklus dokumen komersial Anda — sehingga tidak ada data yang
            tercecer, tidak ada angka yang salah, dan dokumen tidak bisa dipalsukan.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: (i % 3) * 0.08 }}>
              <SpotlightCard>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                  <f.icon style={{ width: 22, height: 22 }} />
                </span>
                <h3 className="mt-4 text-[16px] font-bold text-navy">{f.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">{f.body}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Cara kerja ── */

const STEPS = [
  { title: "Pilih Klien", body: "Cari di master klien — alamat, NPWP, dan PIC langsung terisi. Tambah klien baru langsung dari formulir tanpa keluar." },
  { title: "Susun Item & Pajak", body: "Ambil dari template item tersimpan. PPN 11%, potongan PPh, termin %, dan terbilang dihitung otomatis seketika." },
  { title: "Terbitkan & Kirim", body: "Nomor resmi atomik, QR verifikasi, dan hash SHA-256 terkunci. Otomatis kirim PDF/link via WhatsApp & Email." },
  { title: "Catat Bayar & Lunas", body: "Masukkan nominal masuk — kwitansi sah terbit otomatis. Status invoice langsung berubah menjadi Lunas tanpa manipulasi manual." },
];

function HowItWorks() {
  return (
    <section id="cara-kerja" className="bg-canvas/70 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Eyebrow>Cara Kerja</Eyebrow>
          <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight text-navy sm:text-[34px]">
            Empat Langkah Tertib: Dari Proposal Hingga Rekening Terisi
          </h2>
        </motion.div>

        <div className="relative mt-12">
          <motion.div
            aria-hidden
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 1.0, ease: "easeOut", delay: 0.2 }}
            className="absolute left-[12%] right-[12%] top-[18px] hidden h-0.5 origin-left bg-gradient-to-r from-brand/60 via-brand/30 to-accent/60 md:block"
          />
          <div className="grid gap-5 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div key={s.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.1 }} className="relative rounded-2xl border border-line bg-white p-6 transition-colors hover:border-brand/40">
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.05 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 + i * 0.12 }}
                  className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-navy font-display text-[14px] font-bold text-white ring-4 ring-canvas"
                >
                  {i + 1}
                </motion.span>
                <h3 className="mt-4 text-[15px] font-bold text-navy">{s.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p {...fadeUp} className="tnum mx-auto mt-10 max-w-xl text-center text-[13px] text-slate-500">
          ⚡ Waktu penerbitan rata-rata: di bawah 2 menit per transaksi — menghemat 85% waktu administrasi tim Anda.
        </motion.p>
      </div>
    </section>
  );
}

/* ── Showcase QR Interaktif (Live Smartphone Simulator) ── */

function QrShowcase() {
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
        <motion.div {...fadeUp}>
          <Eyebrow>Inovasi Kredibilitas</Eyebrow>
          <h2 className="mt-3 font-display text-[30px] font-bold leading-tight tracking-tight text-navy sm:text-[36px]">
            Klien Anda tidak perlu menebak. <br />
            <span className="text-brand">Mereka tinggal scan kamera HP.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
            Setiap dokumen yang terbit di Nusadoc memiliki QR unik dan hash SHA-256 yang dikunci di server saat terbit.
            Klien cukup mengarahkan kamera smartphone — tanpa perlu login, tanpa install aplikasi apa pun —
            dan langsung melihat lembar validasi resmi dari server Anda: nomor dokumen, tanggal terbit, penerbit sah, nilai total, dan riwayat termin.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Halaman validasi publik instan — terbuka di browser apa pun dalam 1 detik",
              "Token acak kriptografi: nomor dokumen tidak bisa ditebak atau diintip kompetitor",
              "Snapshot immutable: perubahan master klien tidak akan mengubah riwayat dokumen terbit",
              "Perlindungan rate-limit: aman dari bot scraping pihak ketiga",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[14px] text-slate-700">
                <Check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-600" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex items-center gap-3 rounded-xl border border-line bg-canvas/70 p-3.5 text-[12.5px] text-slate-600 shadow-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>
              <strong>Terverifikasi Kriptografis:</strong> Nilai nominal dan rincian item dilindungi fingerprint digital yang mendeteksi perubahan sekecil apa pun.
            </span>
          </div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
          <InteractiveQrDemo />
        </motion.div>
      </div>
    </section>
  );
}

/* ── Harga (Desain Receipt Thermal Interaktif) ── */

function ReceiptRule() {
  return <span aria-hidden className="my-3 block border-t border-dashed border-[#c9c4b6]" />;
}

function Receipt({
  plan,
  tilted,
  onSelectPlan,
}: {
  plan: (typeof PRICING)[number];
  tilted: string;
  onSelectPlan: (plan: PlanKey) => void;
}) {
  const isCustom = plan.price === "Hubungi";
  const waPlan = `${WA_LINK}%20(${encodeURIComponent(plan.name)})`;

  return (
    <div
      className={cn(
        "relative bg-[#fffdf6] px-6 pb-8 pt-7 font-mono text-[12.5px] leading-relaxed text-[#31302b] shadow-[0_18px_40px_-18px_rgba(11,35,65,0.35)] transition-all duration-300 hover:z-20 hover:-translate-y-3 hover:shadow-[0_30px_60px_-16px_rgba(11,35,65,0.45)] lg:hover:rotate-0",
        "[clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),96%_100%,92%_calc(100%-8px),88%_100%,84%_calc(100%-8px),80%_100%,76%_calc(100%-8px),72%_100%,68%_calc(100%-8px),64%_100%,60%_calc(100%-8px),56%_100%,52%_calc(100%-8px),48%_100%,44%_calc(100%-8px),40%_100%,36%_calc(100%-8px),32%_100%,28%_calc(100%-8px),24%_100%,20%_calc(100%-8px),16%_100%,12%_calc(100%-8px),8%_100%,4%_calc(100%-8px),0_calc(100%-8px))]",
        tilted
      )}
    >
      {plan.badge && (
        <span aria-hidden className="absolute right-4 top-14 -rotate-12 rounded border-[2.5px] border-accent px-2 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent opacity-90 mix-blend-multiply">
          {plan.badge}
        </span>
      )}

      <p className="text-center text-[13.5px] font-bold tracking-[0.08em]">NUSADOC</p>
      <p className="mt-1 text-center text-[10.5px] uppercase tracking-[0.06em] text-[#8b887c]">Penawaran · Invoice · Kwitansi</p>

      <ReceiptRule />

      <div className="flex items-baseline justify-between">
        <span className="font-bold tracking-[0.08em]">{plan.name.toUpperCase()}</span>
        <span className="text-[#8b887c]">×1</span>
      </div>
      <p className="mt-1 text-[11px] text-[#8b887c]">{plan.tagline}</p>

      <ReceiptRule />

      <ul className="space-y-1.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-baseline gap-2">
            <span className="min-w-0 flex-shrink">{f}</span>
            <span aria-hidden className="mb-1 min-w-3 flex-1 border-b border-dotted border-[#c9c4b6]" />
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          </li>
        ))}
      </ul>

      <ReceiptRule />

      <div className="flex items-baseline justify-between text-[17px] font-bold">
        <span>{isCustom ? "HARGA" : "TOTAL"}</span>
        <span className="tnum">
          {isCustom ? "CUSTOM" : (
            <>
              {plan.price} <span className="text-[11px] font-semibold text-[#8b887c]">{plan.unit}</span>
            </>
          )}
        </span>
      </div>
      {plan.roiNote && (
        <p className="mt-1 text-right text-[10.5px] font-semibold text-emerald-700">
          {plan.roiNote}
        </p>
      )}

      <ReceiptRule />

      {isCustom ? (
        <a
          href={WA_LINK}
          target="_blank"
          rel="noreferrer"
          className="block w-full rounded-lg bg-navy py-3 text-center text-[12.5px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-navy-600"
        >
          {plan.cta}
        </a>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onSelectPlan(plan.id as PlanKey)}
            className="btn-sheen block w-full rounded-lg bg-brand py-3 text-center text-[12.5px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-brand-dark"
          >
            {plan.cta}
          </button>
          <a
            href={waPlan}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-[11px] font-medium text-slate-500 hover:text-navy underline"
          >
            atau diskusi via WhatsApp
          </a>
        </div>
      )}

      <div aria-hidden className="mx-auto mt-5 h-9 w-4/5 opacity-70 [background-image:repeating-linear-gradient(90deg,currentColor_0,currentColor_2px,transparent_2px,transparent_5px,currentColor_5px,currentColor_6px,transparent_6px,transparent_9px)]" />
      <p className="mt-2 text-center text-[10px] uppercase tracking-[0.2em] text-[#8b887c]">
        No. {plan.id === "lite" ? "001" : plan.id === "bulanan" ? "002" : plan.id === "hakguna" ? "003" : "004"} · Terima kasih
      </p>
    </div>
  );
}

function Pricing({ onSelectPlan }: { onSelectPlan: (plan: PlanKey) => void }) {
  const tilts = ["lg:-rotate-1", "lg:rotate-[0.5deg]", "lg:-rotate-[0.5deg]", "lg:rotate-[1deg]"];

  return (
    <section id="harga" className="relative bg-canvas py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Eyebrow>Investasi Bisnis</Eyebrow>
          <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight text-navy sm:text-[36px]">
            Pilih Paket yang Pas untuk Bisnis Anda
          </h2>
          <p className="mt-3 text-[15px] text-slate-500">
            Mulai dari paket Lite hemat Rp 50 rb, cloud tanpa batas, atau miliki software seutuhnya di server Anda sendiri.
          </p>
        </motion.div>

        <div className="mt-14 grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {PRICING.map((plan, i) => (
            <motion.div key={plan.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }}>
              <Receipt plan={plan} tilted={tilts[i % tilts.length]} onSelectPlan={onSelectPlan} />
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp} className="mx-auto mt-12 max-w-2xl rounded-2xl border border-line bg-white p-5 text-center text-[13px] leading-relaxed text-slate-600 shadow-sm">
          <ShieldCheck className="mr-1.5 inline h-4 w-4 text-emerald-600" />
          <strong>Kepastian Lisensi Resmi:</strong> Paket <strong>Hak Guna</strong> memberi Anda hak pakai penuh selamanya
          di server Anda sendiri. Kode, merek, dan lisensi resmi diterbitkan oleh PT. SMKarier Inovasi Digital —
          menjamin dukungan teknis jangka panjang dan pembaruan stabil.
        </motion.div>
      </div>
    </section>
  );
}

/* ── Garansi & Komitmen ── */

function Guarantee() {
  const items = [
    { icon: BadgeCheck, title: "Garansi 90 Hari", body: "Bila aplikasi tidak sesuai yang didemokan, tim siap melakukan pendampingan penuh atau uang kembali." },
    { icon: FileText, title: "Terdokumentasi Rapi", body: "PRD, arsitektur teknis, dan panduan operasional tersedia — bukan software kotak hitam." },
    { icon: Layers, title: "100% Data di Server Anda", body: "Paket Hak Guna dipasang di server milik Anda sendiri — rahasia data klien tidak keluar." },
  ];
  return (
    <section className="border-y border-line bg-white py-14">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:grid-cols-3">
        {items.map((g, i) => (
          <motion.div key={g.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <g.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[15px] font-bold text-navy">{g.title}</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-slate-500">{g.body}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── FAQ B2B Komprehensif ── */

const FAQS = [
  {
    q: "Apakah format invoice dan kwitansi Nusadoc sesuai standar akuntansi & perpajakan Indonesia?",
    a: "Ya. Nusadoc mendukung konfigurasi PPN 11% dan PPh 23 (potong pungut pemberi kerja), ejaan terbilang rupiah otomatis, detail bank penerima, serta snapshot nomor dokumen berurutan atomik (NSD/QUO, NSD/INV, NSD/KWT).",
  },
  {
    q: "Bagaimana cara kerja QR verifikasi publik bagi klien saya?",
    a: "Saat invoice atau kwitansi dicetak atau dikirim PDF, dokumen membawa kode QR unik. Klien cukup memindainya memakai kamera HP biasa. Halaman verifikasi publik akan menampilkan dokumen asli di server Anda beserta bukti keaslian hash SHA-256 — tanpa klien perlu login atau menginstal aplikasi.",
  },
  {
    q: "Apakah data bisnis dan klien saya aman jika memilih paket Hak Guna?",
    a: "Sangat aman. Pada paket Hak Guna, seluruh aplikasi dan database MySQL di-deploy langsung di server atau VPS milik Anda sendiri. Tidak ada data transaksi, klien, maupun rincian harga yang dikirim ke server pihak ketiga.",
  },
  {
    q: "Apakah dokumen bisa dikirim otomatis ke WhatsApp dan Email klien?",
    a: "Bisa. Nusadoc dilengkapi modul pengiriman otomatis (SMTP untuk Email dan gateway WhatsApp seperti Fonnte/WaBlas). Begitu penawaran atau invoice terbit, dokumen langsung terkirim otomatis ke kontak PIC klien.",
  },
  {
    q: "Bagaimana jika klien membayar bertahap atau mencicil tagihan termin?",
    a: "Nusadoc dirancang khusus untuk pembayaran bertahap. Anda bisa mencatat pembayaran sebagian (parsial), dan kwitansi sah akan terbit untuk nominal yang masuk. Status invoice akan otomatis berubah dari 'Terbayar Sebagian' menjadi 'Lunas' saat pembayaran genap 100%.",
  },
  {
    q: "Berapa lama waktu yang dibutuhkan untuk mulai menggunakan Nusadoc?",
    a: "Untuk paket Bulanan Cloud: langsung aktif dalam 2 menit setelah checkout Midtrans. Untuk paket Hak Guna: tim kami mendampingi proses instalasi ke VPS/server Anda dalam 1–2 hari kerja hingga siap pakai.",
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-canvas/70 py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-5">
        <motion.div {...fadeUp} className="text-center">
          <Eyebrow>Pertanyaan Umum</Eyebrow>
          <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight text-navy sm:text-[34px]">
            Semua yang Perlu Anda Ketahui Tentang Nusadoc
          </h2>
          <p className="mt-3 text-[15px] text-slate-500">
            Pertanyaan yang paling sering diajukan oleh pemilik bisnis dan admin keuangan.
          </p>
        </motion.div>

        <div className="mt-10 space-y-3.5">
          {FAQS.map((f, i) => (
            <motion.div key={f.q} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}>
              <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50/50"
                >
                  <span className="text-[14.5px] font-semibold text-navy">{f.q}</span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", open === i && "rotate-180 text-brand")} />
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-line/80 px-5 py-4 text-[13.5px] leading-relaxed text-slate-600 bg-canvas/30">
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA Akhir ── */

function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-navy py-20 lg:py-24">
      <motion.div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand/20 blur-[100px]" animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div aria-hidden className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-accent/10 blur-[100px]" animate={{ opacity: [0.3, 0.6, 0.3], scale: [1.1, 0.95, 1.1] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <motion.div {...fadeUp}>
          <Barcode className="mx-auto h-8 w-8 text-brand" />
          <h2 className="mt-5 font-display text-[30px] font-bold leading-tight text-white sm:text-[38px] lg:text-[42px]">
            Saatnya Rapikan Administrasi Bisnis &amp; Amankan Pembayaran Anda.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-300">
            Buka demo sekarang, terbitkan penawaran atau invoice pertama Anda, dan rasakan kepuasan
            melihat alur dokumen tertib dalam 3 menit. Tanpa kartu kredit, tanpa risiko.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/login" className="btn-sheen group inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-7 text-[15px] font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:bg-brand-dark">
              Coba Demo Gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-white/10">
              <MessageCircle className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              Konsultasi via WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Channel pembayaran Midtrans (logo cloud) ── */

function PaymentChannels() {
  return <LogoCloudSwap className="border-t border-line bg-white" />;
}

/* ── Footer ── */

function Footer() {
  return (
    <footer className="border-t border-navy-700 bg-navy-900 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 md:flex-row">
        <div className="flex items-center gap-3">
          <Image
            src="/images/brand/nusadoc-symbol-on-dark.png"
            alt="Nusadoc"
            width={855}
            height={937}
            className="h-10 w-auto object-contain"
          />
          <div>
            <p className="font-display text-[17px] font-bold text-white leading-none">
              Nusa<span className="text-brand">doc</span>
            </p>
            <p className="mt-1 text-[12px] text-slate-400">
              Sistem Dokumen Komersial, Invoice Multi-Termin &amp; Kwitansi Terverifikasi QR.
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Produk resmi PT. SMKarier Inovasi Digital.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[13px] font-medium text-slate-300">
          <Link href="/login" className="transition-colors hover:text-white">Masuk Aplikasi</Link>
          <a href="#harga" className="transition-colors hover:text-white">Paket &amp; Harga</a>
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">Hubungi Tim</a>
        </div>
      </div>
      <p className="tnum mt-8 text-center text-[11px] text-slate-500 border-t border-navy-800/80 pt-6">
        © 2026 PT. SMKarier Inovasi Digital · Nusadoc™ — Hak Cipta Dilindungi Undang-Undang · Dokumen Sah Kriptografis
      </p>
    </footer>
  );
}
