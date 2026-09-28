"use client";

import { cn, formatNumber } from "@/lib/utils";
import type { LineItem } from "@/lib/types";

/**
 * Tabel item — hemat tinta: header latar #f4f7fa + border bawah tegas;
 * saat print latar dimatikan dan pembeda cukup dari border.
 */
export function LineItemTable({
  items,
  footNote,
  className,
}: {
  items: LineItem[];
  footNote?: string;
  className?: string;
}) {
  return (
    <section className={cn("avoid-break", className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-canvas print:bg-white">
            <th className="border-b-2 border-navy/70 py-[5px] pl-1 pr-2 text-left text-[7.5px] font-bold uppercase tracking-[0.1em] text-slate-500 print:border-b-2 print:border-navy">
              #
            </th>
            <th className="border-b-2 border-navy/70 px-2 py-[5px] text-left text-[7.5px] font-bold uppercase tracking-[0.1em] text-slate-500 print:border-b-2 print:border-navy">
              Deskripsi Barang / Jasa
            </th>
            <th className="border-b-2 border-navy/70 px-2 py-[5px] text-right text-[7.5px] font-bold uppercase tracking-[0.1em] text-slate-500 print:border-b-2 print:border-navy">
              Qty
            </th>
            <th className="border-b-2 border-navy/70 px-2 py-[5px] text-left text-[7.5px] font-bold uppercase tracking-[0.1em] text-slate-500 print:border-b-2 print:border-navy">
              Satuan
            </th>
            <th className="border-b-2 border-navy/70 px-2 py-[5px] text-right text-[7.5px] font-bold uppercase tracking-[0.1em] text-slate-500 print:border-b-2 print:border-navy">
              Harga Satuan
            </th>
            <th className="border-b-2 border-navy/70 py-[5px] pl-2 pr-1 text-right text-[7.5px] font-bold uppercase tracking-[0.1em] text-slate-500 print:border-b-2 print:border-navy">
              Jumlah
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id} className="border-b border-line print:border-slate-300">
              <td className="tnum py-[6px] pl-1 pr-2 align-top text-[8.5px] font-semibold text-slate-400">
                {String(i + 1).padStart(2, "0")}
              </td>
              <td className="px-2 py-[6px] align-top">
                <p className="text-[9.5px] font-semibold leading-snug text-slate-800">{it.name}</p>
                {it.description && <p className="mt-[1px] text-[8px] leading-snug text-slate-500">{it.description}</p>}
              </td>
              <td className="tnum px-2 py-[6px] text-right align-top text-[9px] font-medium text-slate-700">
                {formatNumber(it.qty)}
              </td>
              <td className="py-[6px] px-2 align-top text-[9px] text-slate-600">{it.unit}</td>
              <td className="tnum px-2 py-[6px] text-right align-top text-[9px] font-medium text-slate-700">
                {formatNumber(it.unitPrice)}
              </td>
              <td className="tnum py-[6px] pl-2 pr-1 text-right align-top text-[9.5px] font-semibold text-slate-900">
                {formatNumber(Math.round(it.qty * it.unitPrice))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {footNote && <p className="mt-1.5 text-[7.5px] italic leading-snug text-slate-400">{footNote}</p>}
    </section>
  );
}
