"use client";

import { cn, formatNumber } from "@/lib/utils";
import type { DocTotals } from "@/lib/calc";

/**
 * Panel total + terbilang.
 * Hemat tinta: baris angka polos; hanya bar TOTAL yang diberi latar #f4f7fa
 * + garis kiri orange — dan latar itu dimatikan saat print (cukup garis).
 */
export function TotalsPanel({ totals, className }: { totals: DocTotals; className?: string }) {
  return (
    <section className={cn("avoid-break ml-auto w-[240px]", className)}>
      <Row label="Subtotal" value={formatNumber(totals.subtotal)} />
      {totals.ppn > 0 && <Row label={`PPN 11%`} value={formatNumber(totals.ppn)} />}
      {totals.pph23 > 0 && <Row label="PPh 23 (dipotong pemberi kerja)" value={`- ${formatNumber(totals.pph23)}`} />}
      <div className="mt-1.5 flex items-center justify-between gap-3 border-l-4 border-accent bg-canvas px-3 py-2.5 print:border-l-4 print:bg-white">
        <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-navy">Total</span>
        <span className="tnum font-display text-[15px] font-bold text-navy">Rp {formatNumber(totals.total)}</span>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line px-1 py-[4px]">
      <span className="text-[8.5px] font-medium text-slate-500">{label}</span>
      <span className="tnum text-[9.5px] font-semibold text-slate-800">{value}</span>
    </div>
  );
}

/** Terbilang otomatis dari total — admin tidak pernah menulis manual. */
export function TerbilangBlock({ text, className }: { text: string; className?: string }) {
  return (
    <section className={cn("avoid-break border-l-2 border-accent bg-canvas px-3 py-2 print:border-l-2 print:bg-white", className)}>
      <p className="text-[7.5px] font-bold uppercase tracking-[0.16em] text-accent-dark">Terbilang</p>
      <p className="mt-0.5 text-[10px] font-semibold italic leading-snug text-navy">#{text}#</p>
    </section>
  );
}
