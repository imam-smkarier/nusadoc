"use client";

import { cn } from "@/lib/utils";
import type { Client } from "@/lib/types";

export interface DocMetaRow {
  label: string;
  value: string;
}

/**
 * Blok para pihak + info dokumen.
 * `reference` = referensi induk — WAJIB untuk dokumen turunan
 * (Invoice → Penawaran, Kwitansi → Invoice). Ditandai strip kiri orange.
 */
export function PartyBlock({
  partyLabel,
  client,
  metaRows,
  reference,
  className,
}: {
  partyLabel: string;
  client?: Client;
  metaRows: DocMetaRow[];
  reference?: { label: string; number: string; note?: string } | null;
  className?: string;
}) {
  return (
    <section className={cn("avoid-break grid grid-cols-2 gap-8", className)}>
      <div>
        <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400">{partyLabel}</p>
        <p className="mt-1.5 text-[11px] font-bold text-navy">{client?.name ?? "—"}</p>
        {client && (
          <>
            <p className="mt-0.5 text-[9px] leading-[1.6] text-slate-600">
              {client.address}, {client.city}
            </p>
            <p className="tnum mt-1 text-[8.5px] text-slate-500">
              NPWP {client.npwp}
            </p>
            <p className="tnum mt-1.5 text-[8.5px] leading-[1.6] text-slate-500">
              U.p. {client.picName} · {client.picPhone}
              <br />
              {client.picEmail}
            </p>
          </>
        )}
      </div>

      <div>
        <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400">Detail Dokumen</p>
        <table className="mt-1.5 w-full">
          <tbody>
            {metaRows.map((r) => (
              <tr key={r.label} className="align-baseline">
                <td className="w-[110px] whitespace-nowrap pb-[3px] pr-3 text-[8.5px] font-semibold text-slate-500">
                  {r.label}
                </td>
                <td className="tnum pb-[3px] text-[9px] font-medium text-slate-700">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Referensi induk — wajib pada dokumen turunan */}
        {reference && (
          <div className="mt-2 border-l-2 border-accent bg-canvas px-3 py-2 print:bg-white print:border-l-2">
            <p className="text-[7.5px] font-bold uppercase tracking-[0.16em] text-accent-dark">{reference.label}</p>
            <p className="tnum mt-0.5 text-[9.5px] font-bold text-navy">{reference.number}</p>
            {reference.note && <p className="tnum mt-0.5 text-[8px] text-slate-500">{reference.note}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
