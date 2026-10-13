import * as React from "react";

/**
 * Logo channel pembayaran Midtrans aktif untuk PT. SMKarier Inovasi Digital.
 * SVG asli diunduh dari Wikimedia Commons → public/images/payments/.
 *
 * Warna `color` dipakai sebagai fallback bila SVG gagal dimuat.
 */
export interface ChannelLogo {
  name: string;
  src: string;
  color: string;
}

export const LOGOS: ChannelLogo[] = [
  { name: "GoPay", src: "/images/payments/gopay.svg", color: "#00aed6" },
  { name: "BNI", src: "/images/payments/bni.svg", color: "#f26e21" },
  { name: "BRI", src: "/images/payments/bri.svg", color: "#00529c" },
  { name: "Bank Mandiri", src: "/images/payments/mandiri.svg", color: "#003d79" },
  { name: "BSI", src: "/images/payments/bsi.svg", color: "#0f8a5f" },
  { name: "CIMB Niaga", src: "/images/payments/cimb-niaga.svg", color: "#ed1c24" },
  { name: "PermataBank", src: "/images/payments/permata.svg", color: "#00a0df" },
];
