import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { SplashScreen } from "@/components/brand/SplashScreen";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nusadoc.id";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Nusadoc — Software Invoice Multi-Termin & Kwitansi QR Otomatis Indonesia",
    template: "%s · Nusadoc",
  },
  description:
    "Software penawaran harga B2B, invoice termin proyek otomatis, dan kwitansi ber-QR publik yang tidak bisa dipalsukan. Bebas salah hitung PPN/PPh, anti-rekap manual, amankan cash flow bisnis Anda.",
  keywords: [
    "software invoice indonesia",
    "aplikasi penawaran harga b2b",
    "invoice termin proyek otomatis",
    "kwitansi online qr verifikasi",
    "faktur bisnis umkm",
    "sistem billing proyek",
    "software penagihan invoice",
    "tanda tangan digital qr sha256",
    "nusadoc",
    "smkarier inovasi digital",
  ],
  authors: [{ name: "PT. SMKarier Inovasi Digital", url: "https://smkarier.co.id" }],
  creator: "PT. SMKarier Inovasi Digital",
  publisher: "PT. SMKarier Inovasi Digital",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "Nusadoc",
    title: "Nusadoc — Software Invoice Multi-Termin & Kwitansi QR Otomatis Indonesia",
    description:
      "Tutup deal lebih cepat, tagih termin proyek tanpa canggung, dan terbitkan kwitansi ber-QR verifikasi publik anti-falsifikasi. Dirancang untuk UMKM & korporat.",
    images: [
      {
        url: "/images/brand/nusadoc-symbol.png",
        width: 855,
        height: 937,
        alt: "Nusadoc Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nusadoc — Software Invoice Multi-Termin & Kwitansi QR Otomatis",
    description:
      "Sistem penawaran harga, invoice termin, dan kwitansi dengan verifikasi QR publik anti-falsifikasi untuk bisnis Indonesia.",
    images: ["/images/brand/nusadoc-symbol.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/images/brand/nusadoc-icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/images/brand/nusadoc-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/images/brand/nusadoc-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}#organization`,
      name: "PT. SMKarier Inovasi Digital",
      alternateName: "Nusadoc",
      url: SITE_URL,
      logo: `${SITE_URL}/images/brand/nusadoc-symbol.png`,
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+62-812-1358-2508",
        contactType: "customer service",
        availableLanguage: ["id", "en"],
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}#software`,
      name: "Nusadoc",
      operatingSystem: "Web Browser, Cloud, On-Premise",
      applicationCategory: "BusinessApplication",
      offers: [
        {
          "@type": "Offer",
          name: "Paket Bulanan",
          price: "249000",
          priceCurrency: "IDR",
          priceValidUntil: "2027-12-31",
          url: `${SITE_URL}#harga`,
        },
        {
          "@type": "Offer",
          name: "Paket Hak Guna",
          price: "19900000",
          priceCurrency: "IDR",
          priceValidUntil: "2027-12-31",
          url: `${SITE_URL}#harga`,
        },
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        reviewCount: "128",
      },
      description:
        "Software penawaran harga B2B, invoice multi-termin proyek, dan kwitansi otomatis dengan QR verifikasi publik dan proteksi hash SHA-256.",
      publisher: {
        "@id": `${SITE_URL}#organization`,
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="light" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${space.variable} font-sans`}
        suppressHydrationWarning
      >
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
