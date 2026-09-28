import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** 1000000 -> "1.000.000" (tanpa Rp, untuk input) */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.round(n));
}

/** 1000000 -> "Rp 1.000.000" */
export function formatRupiah(n: number): string {
  return `Rp ${formatNumber(n)}`;
}

/** 1000000 -> "482 jt" / "1,2 M" — ringkas untuk kartu statistik */
export function formatRupiahShort(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${trim(n / 1_000_000_000)} M`;
  if (n >= 1_000_000) return `Rp ${trim(n / 1_000_000)} jt`;
  if (n >= 1_000) return `Rp ${trim(n / 1_000)} rb`;
  return formatRupiah(n);
}
function trim(v: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(v);
}

/** Input terformat "1.000.000" -> 1000000 */
export function parseNumberInput(s: string): number {
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "2026-09-13" -> "13 Sep 2026" */
export function formatDateShort(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(iso + "T00:00:00")
  );
}

/** "2026-09-13" -> "13 September 2026" */
export function formatDateLong(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso + "T00:00:00")
  );
}

export function formatTime(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(d);
}

export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA + "T00:00:00").getTime();
  const b = new Date(isoB + "T00:00:00").getTime();
  return Math.round((b - a) / 86_400_000);
}
