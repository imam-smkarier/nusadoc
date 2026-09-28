import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export const metadata: Metadata = {
  title: {
    default: "Nusadoc — Internal",
    template: "%s · Nusadoc",
  },
  description: "Nusadoc — sistem penawaran, invoice multi-termin, dan kwitansi dengan QR verifikasi publik. Setiap dokumen terlindungi hash SHA-256, tidak bisa dipalsukan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="light" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${space.variable} font-sans`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
