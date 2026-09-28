import type { Metadata } from "next";
import Landing from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "Nusadoc — Sistem Dokumen Bisnis dengan QR Verifikasi",
  description:
    "Nusadoc menyambungkan penawaran, invoice multi-termin, dan kwitansi dalam satu alur: data tidak diketik dua kali, dan setiap dokumen membawa QR verifikasi yang tidak bisa dipalsukan.",
};

export default function LandingPage() {
  return <Landing />;
}
