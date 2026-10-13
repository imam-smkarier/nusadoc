import type { Metadata } from "next";
import Landing from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "Nusadoc — Software Invoice Multi-Termin & Kwitansi QR Otomatis Indonesia",
  description:
    "Software penawaran harga B2B, invoice termin proyek otomatis, dan kwitansi ber-QR publik yang tidak bisa dipalsukan. Bebas salah hitung PPN/PPh, anti-rekap manual, amankan cash flow bisnis Anda.",
  alternates: {
    canonical: "/",
  },
};

export default function LandingPage() {
  return <Landing />;
}
