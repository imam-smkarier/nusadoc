"use client";

import { Field } from "@/components/ui/form";
import { Toggle } from "@/components/ui/primitives";
import type { DocTotals } from "@/lib/calc";
import type { TaxConfig } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";

/** Blok Pajak & termin — semua angka dihitung sistem, live. */
export function TaxToggles({ tax, onChange, totals }: { tax: TaxConfig; onChange: (t: TaxConfig) => void; totals: DocTotals }) {
  return (
    <div className="space-y-3">
      <Toggle
        checked={tax.ppnEnabled}
        onChange={(v) => onChange({ ...tax, ppnEnabled: v })}
        label="PPN 11%"
        hint={`+ ${formatRupiah(totals.ppn)} — dipungut atas DPP`}
      />
      <Toggle
        checked={tax.pph23Enabled}
        onChange={(v) => onChange({ ...tax, pph23Enabled: v })}
        label="PPh Pasal 23 (2%)"
        hint={`- ${formatRupiah(totals.pph23)} — dipotong pemberi kerja, bukan mengurangi pendapatan`}
      />
      <Field label="Ringkasan Otomatis">
        <div className="rounded-lg border border-line bg-canvas/60 p-3">
          <SumRow label="Subtotal" value={formatRupiah(totals.subtotal)} />
          {tax.ppnEnabled && <SumRow label={`PPN ${tax.ppnRate}%`} value={`+ ${formatRupiah(totals.ppn)}`} />}
          {tax.pph23Enabled && <SumRow label={`PPh 23 ${tax.pph23Rate}%`} value={`- ${formatRupiah(totals.pph23)}`} />}
          <div className="mt-1.5 flex items-center justify-between border-t border-line pt-2">
            <span className="text-[12px] font-bold text-navy">Total Tagihan</span>
            <span className="tnum text-[15px] font-bold text-navy">{formatRupiah(totals.total)}</span>
          </div>
        </div>
      </Field>
    </div>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-[12.5px]">
      <span className="text-slate-500">{label}</span>
      <span className="tnum font-semibold text-slate-700">{value}</span>
    </div>
  );
}
