"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Barcode,
  Check,
  ChevronDown,
  FileText,
  Landmark,
  Layers,
  MessageCircle,
  Minus,
  Printer,
  QrCode,
  ScanLine,
  ShieldCheck,
  Stamp,
  Users,
} from "lucide-react";
import { DocPreview } from "@/components/documents/DocumentSheet";
import { InvoiceSheet } from "@/components/documents/InvoiceSheet";
import { seedSettings } from "@/lib/seed";
import type { Client, CompanySettings, Invoice, Payment } from "@/lib/types";
import { cn } from "@/lib/utils";

/* ══════════════════ Konten mudah diubah ══════════════════ */

const WA_NUMBER = "6281213582508";
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Halo, saya tertarik dengan Nusadoc. Boleh info lebih lanjut?")}`;

const PRICING = [
  {
    id: "bulanan",
    name: "Bulanan",
    tagline: "Langsung pakai tanpa server sendiri. Cocok untuk mulai kecil.",
    price: "Rp 249",
    unit: "rb / bulan",
    cta: "Mulai Sekarang",
    badge: undefined as string | undefined,
    features: [
      "Dokumen tanpa batas",
      "QR verifikasi untuk klien",
      "3 pengguna (tambah Rp 59 rb/user)",
      "Update otomatis di cloud",
      "Dukungan via email",
    ],
  },
  {
    id: "hakguna",
    name: "Hak Guna",
    tagline: "Aplikasi terpasang di server Anda sendiri. Sekali bayar, milik selamanya.",
    price: "Rp 19,9",
    unit: "jt sekali bayar",
    cta: "Ambil Hak Guna",
    badge: "Paling Dipilih",
    features: [
      "Seluruh fitur Bulanan",
      "Pengguna tanpa batas",
      "Data 100% di server Anda",
      "Pembaruan 1 tahun penuh",
      "Garansi 90 hari + onboarding",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Multi-perusahaan, integrasi, atau jadi mitra reseller.",
    price: "Hubungi",
    unit: "kami",
    cta: "Diskusi Kebutuhan",
    badge: undefined,
    features: [
      "Multi-tenant / multi-cabang",
      "White-label untuk reseller",
      "Integrasi Midtrans & sistem lain",
      "SLA & pendampingan khusus",
    ],
  },
];

/* Dokumen contoh untuk hero */
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
  hash: "—",
  issuedAt: "2026-09-01T09:00:00.000Z",
};

const heroPayments: Payment[] = [
  { id: "pay-hero", invoiceId: "hero", date: "2026-09-10", amount: 72_705_000, method: "Transfer Bank", receiptId: "rcp-hero" },
];

const heroSettings: CompanySettings = seedSettings;

const USE_CASES = [
  "Kontraktor & System Integrator",
  "IT & Software House",
  "Distributor & Supplier",
  "Kantor & Yayasan",
  "F&B & Ritel",
  "Klinik & Praktik",
];

/* ══════════════════ Util ══════════════════ */

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.05 },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">{children}</p>;
}

function ImageSlot({ label, slotId, aspect = "aspect-[4/3]", src }: { label: string; slotId: string; aspect?: string; src?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={label} className={cn("w-full rounded-xl object-cover shadow-sheet", aspect)} />;
  }
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-canvas/60 text-center", aspect)}>
      <ScanLine className="h-6 w-6 text-slate-300" />
      <p className="px-6 text-[12.5px] font-medium text-slate-400">{label}</p>
      <p className="rounded border border-line bg-white px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-400">Slot {slotId}</p>
    </div>
  );
}

const heroItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

function HeroDocTilt({ children }: { children: React.ReactNode }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 150, damping: 20 });
  const springY = useSpring(my, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(springY, [-200, 200], [5, -5]);
  const rotateY = useTransform(springX, [-200, 200], [-5, 5]);

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 1200 }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - rect.left - rect.width / 2);
        my.set(e.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      className="relative will-change-transform"
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

/* ══════════════════ Halaman ══════════════════ */

export default function Landing() {
  return (
    <MotionConfig reducedMotion="never">
      <div className="min-h-dvh bg-white">
        <Navbar />
        <Hero />
        <Problems />
        <TurningPoint />
        <Features />
        <HowItWorks />
        <QrShowcase />
        <Pricing />
        <Guarantee />
        <Faq />
        <FinalCta />
        <Footer />
      </div>
    </MotionConfig>
  );
}

/* ── Navbar ── */

function Navbar() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26 });
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
        "sticky top-0 z-50 border-b backdrop-blur-md transition-all duration-300",
        scrolled ? "border-line bg-white/95 shadow-card" : "border-transparent bg-white/80"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-[19px] font-bold tracking-tight text-navy">
            Nusa<span className="text-brand">doc</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {[["Kenapa Nusadoc", "#kenapa"], ["Cara Kerja", "#cara-kerja"], ["Harga", "#harga"], ["FAQ", "#faq"]].map(([label, href]) => (
            <a key={href} href={href} className="text-[13.5px] font-medium text-slate-600 transition-colors hover:text-navy">
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <Link href="/login" className="hidden rounded-lg px-3.5 py-2 text-[13.5px] font-semibold text-navy transition-colors hover:bg-canvas sm:block">
            Masuk
          </Link>
          <Link href="/login" className="btn-sheen inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[13.5px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark">
            Coba Demo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      <motion.span aria-hidden style={{ scaleX: progress }} className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-brand via-sky-400 to-accent" />
    </header>
  );
}

/* ── Hero — story hook ── */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[540px] w-[540px] rounded-full bg-brand/[0.07] blur-[110px]" />
      <div className="pointer-events-none absolute -left-32 top-1/2 h-80 w-80 rounded-full bg-accent/[0.05] blur-[90px]" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-20">
        <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } }}>
          <motion.span variants={heroItem} className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-soft px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">
            <Stamp className="h-3.5 w-3.5" />
            Nusadoc — Sistem Dokumen Bisnis
          </motion.span>

          <motion.h1 variants={heroItem} className="mt-5 font-display text-[36px] font-bold leading-[1.08] tracking-tight text-navy sm:text-[46px] lg:text-[52px]">
            Kwitansi Anda,{" "}
            <span className="text-brand">tidak bisa dipalsukan.</span>
          </motion.h1>

          <motion.p variants={heroItem} className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-slate-600">
            Setiap kwitansi yang Anda terbitkan lewat Nusadoc membawa QR verifikasi
            dan hash SHA-256. Klien memindai — langsung melihat dokumen asli beserta
            nilainya. Tanpa login, tanpa ragu, tanpa telepon konfirmasi.
          </motion.p>

          <motion.p variants={heroItem} className="mt-3 max-w-xl text-[14px] leading-relaxed text-slate-500">
            Dan yang paling penting: penawaran, invoice, dan kwitansi tersambung dalam
            satu alur — data tidak pernah diketik dua kali.
          </motion.p>

          <motion.div variants={heroItem} className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login" className="btn-sheen group inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-[15px] font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark">
              Coba Demo Gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#harga" className="inline-flex h-12 items-center rounded-xl border border-line bg-white px-6 text-[15px] font-semibold text-navy transition-colors hover:border-brand/50">
              Lihat Harga
            </a>
          </motion.div>

          <motion.p variants={heroItem} className="tnum mt-5 text-[12.5px] text-slate-400">
            Tanpa kartu kredit · Demo langsung berisi data · Opsi data di server Anda sendiri
          </motion.p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }} className="relative">
          <HeroDocTilt>
            <div className="relative mx-auto max-w-[560px]">
              <div className="relative max-h-[540px] overflow-hidden rounded-xl shadow-sheet">
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
                  <span className="block text-[11px] text-slate-400">status dihitung otomatis</span>
                </span>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18, delay: 1.2 }} className="absolute -left-3 bottom-14 flex items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 shadow-pop sm:-left-8">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <QrCode className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[12.5px] font-bold text-navy">QR Terverifikasi</span>
                  <span className="block text-[11px] text-slate-400">dipindai klien, tanpa login</span>
                </span>
              </motion.div>
            </div>
          </HeroDocTilt>
        </motion.div>
      </div>

      <div className="marquee-mask overflow-hidden border-t border-line/70 bg-canvas/60 py-4">
        <div className="animate-marquee-x flex w-max items-center gap-10 px-5">
          {[0, 1].map((dup) => (
            <div key={dup} aria-hidden={dup === 1} className="flex items-center gap-10">
              <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Dipakai untuk</span>
              {USE_CASES.map((k) => (
                <span key={k} className="flex items-center gap-2.5 whitespace-nowrap text-[13px] font-semibold text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand/40" />
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

/* ── Masalah — dari riset UMKM Indonesia ── */

const PROBLEMS = [
  {
    title: "Kwitansi Anda diragukan keasliannya",
    body: "Klien menelepon untuk konfirmasi: \u201cIni kwitansi beneran nggak?\u201d Atau lebih parah — kwitansi Anda difotokopi dan dipalsukan orang lain, dan Anda yang disalahkan.",
  },
  {
    title: "Data yang sama diketik ulang 3–4 kali",
    body: "Nama klien, alamat, NPWP, daftar item — di Word, lalu Excel, lalu kwitansi. Satu angka salah ketik, dokumen dibuat ulang. Waktu habis untuk kerjaan administratif.",
  },
  {
    title: "Invoice telat dibayar karena dokumen tidak lengkap",
    body: "Penelitian menunjukkan penyebab utama pembayaran tertunda: invoice tidak lengkap, tidak ada nomor PO, dan klien \u201cbelum menerima\u201d dokumen. Bukan karena klien tidak punya uang — tapi karena dokumennya tidak rapi.",
  },
];

function Problems() {
  return (
    <section className="bg-canvas/70 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Eyebrow>Yang sering terjadi</Eyebrow>
          <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight text-navy sm:text-[34px]">
            Kalau ini terjadi di bisnis Anda, Anda tidak sendirian.
          </h2>
          <p className="mt-3 text-[15px] text-slate-500">
            Berdasarkan data UMKM Indonesia, tiga masalah ini paling sering membuat bisnis kehilangan uang dan waktu.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <motion.div
              key={p.title}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.1 }}
              className="group rounded-2xl border border-line bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-pop"
            >
              <span className="tnum font-display text-[28px] font-bold text-brand/25 transition-colors group-hover:text-brand/60">
                0{i + 1}
              </span>
              <h3 className="mt-3 text-[16px] font-bold leading-snug text-navy">{p.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">{p.body}</p>
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
    <section className="relative overflow-hidden bg-navy py-20">
      <motion.div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand/20 blur-[100px]" animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <motion.div {...fadeUp}>
          <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-brand">Bayangkan</p>
          <h2 className="mt-4 font-display text-[28px] font-bold leading-tight text-white sm:text-[36px]">
            Anda baru saja menyelesaikan proyek.
            <br />
            Kwitansi terbit dalam 2 menit.
            <br />
            <span className="text-brand">Klien memindai QR — dan langsung yakin.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-slate-300">
            Tidak ada telepon konfirmasi. Tidak ada keraguan. Tidak ada kwitansi palsu
            yang memakai nama Anda. Dokumen tersimpan rapi, terarsip, dan bisa dilihat
            kapan pun dibutuhkan.
          </p>
          <p className="mt-4 max-w-xl mx-auto text-[14px] leading-relaxed text-slate-400">
            Itulah cara kerja Nusadoc — bukan sekadar aplikasi pembuat kwitansi, tapi sistem
            yang melindungi reputasi bisnis Anda.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Fitur ── */

const FEATURES = [
  {
    icon: Layers,
    title: "Multi-termin tanpa hitung ulang",
    body: "Satu penawaran bisa melahirkan banyak invoice — DP, progres, retensi, pelunasan — dengan nilai proporsional yang dihitung sistem.",
  },
  {
    icon: QrCode,
    title: "QR verifikasi untuk klien",
    body: "Setiap dokumen membawa QR + hash SHA-256. Klien memindai, langsung melihat dokumen asli beserta nilainya — tanpa perlu akun, tanpa aplikasi tambahan.",
  },
  {
    icon: Landmark,
    title: "Pajak & terbilang otomatis",
    body: "PPN 11%, PPh 23, termin, dan terbilang dihitung sistem dari data yang sama — selisih rupiah antar-dokumen tidak mungkin terjadi.",
  },
  {
    icon: Printer,
    title: "Siap cetak, hemat tinta",
    body: "Layout A4 dirancang untuk printer kantor: tanpa blok warna gelap, teks tetap tegas — kwitansi 50 lembar pun tidak menguras tinta.",
  },
  {
    icon: Users,
    title: "Multi-user dengan hak akses",
    body: "Sales menerbitkan penawaran, finance mencatat pembayaran, direksi menyetujui. Setiap peran hanya melihat yang perlu — tidak ada bentrok.",
  },
  {
    icon: ShieldCheck,
    title: "Dokumen terkunci & jejak audit",
    body: "Setiap penerbitan tercatat: siapa, kapan, nomor apa. Dokumen yang sudah terbit terkunci datanya — tidak bisa diubah diam-diam oleh siapa pun.",
  },
];

function Features() {
  return (
    <section id="fitur" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Eyebrow>Yang Anda dapat</Eyebrow>
          <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight text-navy sm:text-[34px]">
            Bukan sekadar pembuat kwitansi
          </h2>
          <p className="mt-3 text-[15px] text-slate-500">
            Nusadoc menghubungkan seluruh dokumen jualan Anda — sehingga tidak ada yang lewat, tidak ada yang salah, dan tidak ada yang bisa dipalsukan.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: (i % 3) * 0.08 }}>
              <SpotlightCard>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                  <f.icon style={{ width: 22, height: 22 }} />
                </span>
                <h3 className="mt-4 text-[15.5px] font-bold text-navy">{f.title}</h3>
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
  { title: "Pilih klien", body: "Cari di master klien — alamat, NPWP, dan PIC langsung terisi. Klien baru bisa dibuat tanpa keluar dari form." },
  { title: "Susun item & pajak", body: "Ambil dari template item yang tersimpan. PPN, potongan, termin, dan terbilang dihitung sistem saat Anda mengetik." },
  { title: "Terbitkan & kirim", body: "Nomor resmi, QR verifikasi, dan preview A4 langsung siap. Cetak atau kirim PDF ke klien — dokumen terkunci dan tercatat." },
  { title: "Catat pembayaran", body: "Sebagian atau penuh — kwitansi terbit otomatis dengan QR-nya sendiri. Status invoice berubah sendiri menjadi Lunas." },
];

function HowItWorks() {
  return (
    <section id="cara-kerja" className="bg-canvas/70 py-20">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Eyebrow>Cara kerja</Eyebrow>
          <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight text-navy sm:text-[34px]">
            Empat langkah, dari penawaran sampai lunas
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

        <motion.p {...fadeUp} className="tnum mx-auto mt-10 max-w-xl text-center text-[13px] text-slate-400">
          Total waktu untuk kwitansi pertama: di bawah 5 menit — termasuk menyalin data dari penawaran.
        </motion.p>
      </div>
    </section>
  );
}

/* ── Showcase QR ── */

function QrShowcase() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
        <motion.div {...fadeUp}>
          <Eyebrow>Kenapa QR ini berbeda</Eyebrow>
          <h2 className="mt-3 font-display text-[28px] font-bold leading-tight tracking-tight text-navy sm:text-[34px]">
            Klien Anda tidak perlu percaya. Mereka tinggal memindai.
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-slate-600">
            Setiap dokumen terbit membawa QR dan hash SHA-256. Saat klien memindai,
            mereka melihat halaman validasi resmi dari server Anda: nomor, tanggal,
            penerbit, nilai, dan dokumen aslinya. Tidak ada yang bisa memalsukan QR ini
            — karena data verifikasinya tidak tersimpan di dokumen, tapi di server Anda.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Halaman validasi publik — tanpa login, tanpa aplikasi tambahan",
              "Token acak: nomor dokumen tidak bisa ditebak orang lain",
              "Dokumen terkunci saat terbit — edit master tidak mengubah arsip",
              "Rate-limited: tidak bisa di-scrape bot pihak ketiga",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[14px] text-slate-600">
                <Check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-500" style={{ width: 18, height: 18 }} />
                {t}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.15 }}>
          <ImageSlot
            slotId="A"
            label="Foto: tangan klien memindai QR pada kwitansi yang dicetak, di meja kerja — gaya foto komersial terang"
            aspect="aspect-[4/3]"
          />
        </motion.div>
      </div>
    </section>
  );
}

/* ── Harga ── */

function ReceiptRule() {
  return <span aria-hidden className="my-3 block border-t border-dashed border-[#c9c4b6]" />;
}

function Receipt({ plan, tilted }: { plan: (typeof PRICING)[number]; tilted: string }) {
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

      <ReceiptRule />

      <a
        href={isCustom ? WA_LINK : waPlan}
        target="_blank"
        rel="noreferrer"
        className="block w-full rounded-lg bg-navy py-3 text-center text-[12.5px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-navy-600"
      >
        {plan.cta}
      </a>

      <div aria-hidden className="mx-auto mt-5 h-9 w-4/5 opacity-70 [background-image:repeating-linear-gradient(90deg,currentColor_0,currentColor_2px,transparent_2px,transparent_5px,currentColor_5px,currentColor_6px,transparent_6px,transparent_9px)]" />
      <p className="mt-2 text-center text-[10px] uppercase tracking-[0.2em] text-[#8b887c]">
        No. {plan.id === "bulanan" ? "001" : plan.id === "hakguna" ? "002" : "003"} · Terima kasih
      </p>
    </div>
  );
}

function Pricing() {
  const tilts = ["lg:-rotate-1", "lg:rotate-[0.6deg] lg:-translate-y-2", "lg:rotate-[1.4deg]"];

  return (
    <section id="harga" className="relative bg-canvas py-20">
      <div className="mx-auto max-w-6xl px-5">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Eyebrow>Harga</Eyebrow>
          <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight text-navy sm:text-[34px]">
            Pilih yang pas untuk bisnismu
          </h2>
          <p className="mt-3 text-[15px] text-slate-500">
            Mulai dari yang kecil. Naik kapan pun kamu siap — tanpa kehilangan data.
          </p>
        </motion.div>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-3 lg:gap-7">
          {PRICING.map((plan, i) => (
            <motion.div key={plan.id} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.12 }}>
              <Receipt plan={plan} tilted={tilts[i]} />
            </motion.div>
          ))}
        </div>

        <motion.p {...fadeUp} className="mx-auto mt-12 max-w-2xl text-center text-[13px] leading-relaxed text-slate-500">
          <ShieldCheck className="mr-1.5 inline h-4 w-4 text-brand" />
          Nusadoc berlisensi: paket <strong>Hak Guna</strong> memberi Anda hak pakai penuh selamanya
          di server Anda sendiri, sementara merek, kode, dan lisensi tetap milik PT. SMKarier Inovasi Digital —
          sehingga Anda selalu menerima pembaruan resmi dan dukungan jangka panjang.
        </motion.p>
      </div>
    </section>
  );
}

/* ── Garansi ── */

function Guarantee() {
  const items = [
    { icon: BadgeCheck, title: "Garansi 30 hari", body: "Bila aplikasi tidak sesuai yang didemokan, uang kembali penuh." },
    { icon: FileText, title: "Ter dokumentasi rapi", body: "PRD, arsitektur, dan panduan operasional tersedia — bukan aplikasi kotak hitam." },
    { icon: Layers, title: "Jalan di server Anda", body: "Paket Hak Guna dipasang di server milik Anda sendiri — data tidak keluar." },
  ];
  return (
    <section className="border-y border-line bg-white py-12">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:grid-cols-3">
        {items.map((g, i) => (
          <motion.div key={g.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.08 }} className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <g.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-[14.5px] font-bold text-navy">{g.title}</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-slate-500">{g.body}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── FAQ ── */

const FAQS = [
  {
    q: "Apakah data bisnis saya aman?",
    a: "Ya. Login memakai sesi terenkripsi, setiap pengguna punya hak akses berbeda (sales, finance, direksi), dan setiap penerbitan dokumen tercatat dalam jejak audit. Paket Hak Guna dipasang di server milik Anda sendiri — data tidak pernah keluar dari infrastruktur Anda.",
  },
  {
    q: "Apa bedanya paket Bulanan dan Hak Guna?",
    a: "Bulanan = langganan di cloud kami, langsung pakai tanpa urusan teknis, bayar per bulan. Hak Guna = sekali bayar, aplikasi terpasang di server Anda, pengguna tanpa batas, dan pembaruan resmi selama 1 tahun (dapat diperpanjang). Keduanya bisa di-upgrade satu ke lainnya.",
  },
  {
    q: "Apakah kwitansi ini sah secara hukum?",
    a: "Kwitansi Nusadoc adalah bukti penerimaan pembayaran yang valid dengan verifikasi QR + hash SHA-256. Tanda tangan pada dokumen adalah specimen + QR verifikasi — bukan tanda tangan elektronik tersertifikasi PSrE. Bila dibutuhkan kekuatan hukum penuh (mis. kontrak besar), integrasi dengan penyelenggara PSrE tersedia sebagai proyek terpisah.",
  },
  {
    q: "Printer kantor biasa bisa dipakai?",
    a: "Bisa, dan justru itu salah satu keunggulannya. Layout dokumen dirancang hemat tinta: tanpa blok warna gelap, hanya garis tipis dan aksen kecil. Mencetak 50 kwitansi tidak akan menghabiskan cartridge Anda.",
  },
  {
    q: "Saya punya beberapa perusahaan / cabang. Bisa?",
    a: "Paket Enterprise mendukung multi-perusahaan dan multi-cabang, termasuk white-label untuk konsultan yang ingin menjualnya ke klien masing-masing. Diskusikan kebutuhan Anda lewat WhatsApp.",
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-canvas/70 py-20">
      <div className="mx-auto max-w-3xl px-5">
        <motion.div {...fadeUp} className="text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-3 font-display text-[28px] font-bold tracking-tight text-navy sm:text-[34px]">
            Masih ragu? Wajar kok.
          </h2>
        </motion.div>

        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <motion.div key={f.q} {...fadeUp} transition={{ ...fadeUp.transition, delay: i * 0.05 }}>
              <div className="overflow-hidden rounded-xl border border-line bg-white">
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-[14.5px] font-semibold text-navy">{f.q}</span>
                  {open === i ? <Minus className="h-4 w-4 shrink-0 text-brand" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="border-t border-line px-5 py-4 text-[13.5px] leading-relaxed text-slate-600">{f.a}</p>
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

/* ── CTA akhir ── */

function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-navy py-20">
      <motion.div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand/20 blur-[100px]" animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div aria-hidden className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-accent/10 blur-[100px]" animate={{ opacity: [0.3, 0.6, 0.3], scale: [1.1, 0.95, 1.1] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} />
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <motion.div {...fadeUp}>
          <Barcode className="mx-auto h-8 w-8 text-brand" />
          <h2 className="mt-5 font-display text-[30px] font-bold leading-tight text-white sm:text-[38px]">
            Cobalah terbitkan kwitansi pertama Anda.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-slate-300">
            Buka demo, pilih klien contoh, terbitkan penawaran, catat pembayaran — dan lihat kwitansi
            dengan QR-nya terbit otomatis. Lima menit, tanpa kartu kredit, tanpa komitmen.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="btn-sheen group inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-7 text-[15px] font-semibold text-white shadow-lg shadow-brand/30 transition-colors hover:bg-brand-dark">
              Coba Demo Gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-white/10">
              <MessageCircle className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              Chat WhatsApp
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Footer ── */

function Footer() {
  return (
    <footer className="border-t border-navy-700 bg-navy-900 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 md:flex-row">
        <div>
          <p className="font-display text-[16px] font-bold text-white">
            Nusa<span className="text-brand">doc</span>
          </p>
          <p className="mt-1 text-[12px] text-slate-400">
            Produk PT. SMKarier Inovasi Digital — merek, kode &amp; lisensi tetap milik pengembang.
          </p>
        </div>
        <div className="flex items-center gap-6 text-[13px] font-medium text-slate-300">
          <Link href="/login" className="transition-colors hover:text-white">Masuk</Link>
          <a href="#harga" className="transition-colors hover:text-white">Harga</a>
          <a href={WA_LINK} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">Kontak</a>
        </div>
      </div>
      <p className="tnum mt-8 text-center text-[11px] text-slate-500">
        © 2026 PT. SMKarier Inovasi Digital · Nusadoc™ — Hak guna per perusahaan · Dokumen terverifikasi QR
      </p>
    </footer>
  );
}
