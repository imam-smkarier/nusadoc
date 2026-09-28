/**
 * Terbilang — angka ke kata (Bahasa Indonesia).
 * Mendukung hingga ratusan triliun. Output: "Empat Ratus Delapan Puluh Dua Juta ... Rupiah".
 */

const SATUAN = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

function baca(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${baca(n - 10)} Belas`;
  if (n < 100) return `${baca(Math.floor(n / 10))} Puluh ${baca(n % 10)}`.trim();
  if (n < 200) return `Seratus ${baca(n - 100)}`.trim();
  if (n < 1_000) return `${baca(Math.floor(n / 100))} Ratus ${baca(n % 100)}`.trim();
  if (n < 2_000) return `Seribu ${baca(n - 1_000)}`.trim();
  if (n < 1_000_000) return `${baca(Math.floor(n / 1_000))} Ribu ${baca(n % 1_000)}`.trim();
  if (n < 1_000_000_000) return `${baca(Math.floor(n / 1_000_000))} Juta ${baca(n % 1_000_000)}`.trim();
  if (n < 1_000_000_000_000) return `${baca(Math.floor(n / 1_000_000_000))} Miliar ${baca(n % 1_000_000_000)}`.trim();
  return `${baca(Math.floor(n / 1_000_000_000_000))} Triliun ${baca(n % 1_000_000_000_000)}`.trim();
}

export function terbilang(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return "Nol Rupiah";
  const kata = baca(n)
    .split(" ")
    .filter(Boolean)
    .map((w) => (w === "Rupiah" ? "Rupiah" : w))
    .join(" ");
  return `${kata} Rupiah`;
}
