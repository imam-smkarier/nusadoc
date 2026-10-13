/**
 * Katalog paket langganan Nusadoc — SATU sumber kebenaran untuk:
 * landing page, halaman /langganan, enforcement kuota server, dan checkout.
 */

export type PlanId = "trial" | "lite" | "bulanan" | "hakguna" | "enterprise";

export interface PlanMeta {
  id: PlanId;
  name: string;
  tagline: string;
  /** Rupiah bulat; 0 = gratis (trial); null = hubungi kami */
  priceIdr: number | null;
  /** "bln" | "sekali bayar" | "" */
  unit: string;
  /** null = unlimited */
  docsLimit: number | null;
  usersLimit: number | null;
  /** null = selamanya (lifetime) */
  durationDays: number | null;
  features: string[];
  cta: string;
  badge?: string;
  /** Checkout Midtrans tersedia (bukan "hubungi kami") */
  selfServe: boolean;
}

export const TRIAL_DAYS = 30;

export const PLAN_CATALOG: Record<PlanId, PlanMeta> = {
  trial: {
    id: "trial",
    name: "Trial",
    tagline: "Coba seluruh fitur Nusadoc gratis 30 hari — tanpa kartu kredit.",
    priceIdr: 0,
    unit: "gratis 30 hari",
    docsLimit: null,
    usersLimit: 3,
    durationDays: TRIAL_DAYS,
    features: [
      "Seluruh fitur paket Bulanan",
      "Dokumen tanpa batas selama 30 hari",
      "QR verifikasi publik & hash SHA-256",
      "Kirim otomatis WhatsApp & Email",
    ],
    cta: "Coba Gratis 30 Hari",
    selfServe: false, // trial via registrasi, bukan checkout
  },
  lite: {
    id: "lite",
    name: "Lite",
    tagline: "Paling hemat untuk usaha yang baru rapi. Pas untuk freelancer & UMKM kecil.",
    priceIdr: 50_000,
    unit: "bln",
    docsLimit: 25,
    usersLimit: 1,
    durationDays: 30,
    features: [
      "25 dokumen / bulan (penawaran + invoice + kwitansi)",
      "QR verifikasi publik & hash SHA-256",
      "Multi-termin proyek & pajak otomatis",
      "1 pengguna (pemilik bisnis)",
      "Dukungan via email",
    ],
    cta: "Mulai Lite",
    badge: "Termurah",
    selfServe: true,
  },
  bulanan: {
    id: "bulanan",
    name: "Bulanan",
    tagline: "Langsung pakai tanpa server sendiri. Cocok untuk tim kecil yang bertumbuh.",
    priceIdr: 249_000,
    unit: "bln",
    docsLimit: null,
    usersLimit: 3,
    durationDays: 30,
    features: [
      "Dokumen tanpa batas",
      "QR verifikasi publik & hash SHA-256",
      "Multi-termin proyek (DP, progres, pelunasan)",
      "Kirim otomatis ke WhatsApp & Email PIC klien",
      "3 pengguna (tambah Rp 59 rb/user)",
      "Update otomatis di cloud & backup harian",
    ],
    cta: "Mulai Sekarang",
    badge: "Paling Populer",
    selfServe: true,
  },
  hakguna: {
    id: "hakguna",
    name: "Hak Guna",
    tagline: "Terpasang di server Anda sendiri. Sekali bayar, milik selamanya tanpa iuran.",
    priceIdr: 19_900_000,
    unit: "sekali bayar",
    docsLimit: null,
    usersLimit: null,
    durationDays: null,
    features: [
      "Seluruh fitur paket Bulanan tanpa batasan",
      "Pengguna tanpa batas (unlimited team)",
      "100% data tersimpan di server / VPS milik Anda",
      "Bebas biaya langganan bulanan selamanya",
      "Pembaruan resmi 1 tahun penuh + onboarding",
      "Garansi implementasi 90 hari uang kembali",
    ],
    cta: "Ambil Hak Guna",
    selfServe: true,
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Multi-perusahaan, custom integrasi ERP, atau lisensi reseller white-label.",
    priceIdr: null,
    unit: "hubungi kami",
    docsLimit: null,
    usersLimit: null,
    durationDays: null,
    features: [
      "Multi-cabang & multi-entitas PT/CV dalam 1 portal",
      "Integrasi payment gateway & sistem accounting",
      "White-label khusus konsultan & software agency",
      "Dedicated server setup & migrasi data custom",
      "SLA respons prioritas & pendampingan khusus",
    ],
    cta: "Diskusi Kebutuhan",
    selfServe: false,
  },
};

/** Plan yang bisa dibayar self-serve via Midtrans */
export const CHECKOUT_PLANS: PlanId[] = ["lite", "bulanan", "hakguna"];

export function isCheckoutPlan(id: string): id is "lite" | "bulanan" | "hakguna" {
  return CHECKOUT_PLANS.includes(id as "lite" | "bulanan" | "hakguna");
}

/** Tampilkan "Rp 50 rb" / "Rp 249 rb" / "Rp 19,9 jt" untuk kartu harga */
export function formatPlanPrice(priceIdr: number | null): { price: string; unit: string } {
  if (priceIdr === null) return { price: "Hubungi", unit: "kami" };
  if (priceIdr === 0) return { price: "Gratis", unit: "30 hari" };
  if (priceIdr >= 1_000_000) {
    const jt = priceIdr / 1_000_000;
    return { price: `Rp ${jt.toLocaleString("id-ID", { maximumFractionDigits: 1 })}`, unit: "jt sekali bayar" };
  }
  return { price: `Rp ${Math.round(priceIdr / 1000)}`, unit: "rb / bulan" };
}
