"use client";

import { Badge } from "@/components/ui/primitives";
import { computeTotals } from "@/lib/calc";
import { terbilang } from "@/lib/terbilang";
import { validationUrl } from "@/lib/token";
import type { Client, CompanySettings, Invoice, Receipt } from "@/lib/types";
import { formatDateShort, formatNumber } from "@/lib/utils";
import { DocumentFooter } from "./DocumentFooter";
import { DocumentHeader } from "./DocumentHeader";
import { PartyBlock } from "./PartyBlock";
import { SignatureBlock } from "./SignatureBlock";
import { TerbilangBlock } from "./TotalsPanel";
import { DocumentSheet } from "./DocumentSheet";

/**
 * Lembar KWITANSI — tanpa draft, sekali terbit final.
 * Referensi induk (invoice) wajib tampil di badan dokumen.
 */
export function ReceiptSheet({
  receipt,
  invoice,
  client,
  settings,
  paidTotal,
  invoiceTotal,
}: {
  receipt: Receipt;
  invoice?: Invoice;
  client?: Client;
  settings: CompanySettings;
  /** total pembayaran kumulatif invoice (termasuk kwitansi ini) — mengalahkan receipt.amount */
  paidTotal?: number;
  /** total tagihan invoice — override perhitungan lokal bila diberikan */
  invoiceTotal?: number;
}) {
  const invoiceTotalValue = invoiceTotal ?? (invoice ? computeTotals(invoice.items, invoice.tax).total : 0);
  const paidValue = paidTotal ?? receipt.amount;
  const isPartial = invoiceTotalValue > 0 && paidValue < invoiceTotalValue;
  const remaining = Math.max(0, invoiceTotalValue - paidValue);

  return (
    <DocumentSheet>
      {/* Stempel outline — hemat tinta, tanpa fill */}
      <div className="pointer-events-none absolute right-[16mm] top-[58mm] rotate-[-8deg] select-none">
        <div className="border-[2.5px] border-accent/70 px-5 py-1.5 text-center">
          <p className="font-display text-[15px] font-bold uppercase tracking-[0.22em] text-accent/80">
            {isPartial ? "Diterima Sebagian" : "Pembayaran Diterima — Lunas"}
          </p>
          <p className="tnum mt-0.5 text-[7px] font-semibold uppercase tracking-[0.18em] text-accent/70">
            {formatDateShort(receipt.date)}
          </p>
        </div>
      </div>

      <DocumentHeader
        settings={settings}
        title="KWITANSI"
        docLabel="Bukti Penerimaan Pembayaran"
        number={receipt.number}
        dateLine={`Diterima ${formatDateShort(receipt.date)}`}
        badge={
          <Badge tone="green" dot>
            TERBIT FINAL
          </Badge>
        }
      />

      <PartyBlock
        partyLabel="Telah Diterima Dari"
        client={client}
        metaRows={[
          { label: "Nomor", value: receipt.number },
          { label: "Tanggal Terima", value: formatDateShort(receipt.date) },
          { label: "Metode", value: receipt.method },
        ]}
        reference={
          invoice
            ? {
                label: "Referensi Invoice",
                number: invoice.number,
                note: `${invoice.subject} · Jatuh tempo ${formatDateShort(invoice.dueDate)}`,
              }
            : null
        }
      />

      <section className="avoid-break mt-5">
        <div className="grid grid-cols-[130px_1fr] items-baseline gap-2 border-b border-line pb-2">
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400">Uang Sejumlah</p>
          <p className="tnum font-display text-[17px] font-bold text-navy">Rp {formatNumber(receipt.amount)},-</p>
        </div>
        <div className="mt-2 grid grid-cols-[130px_1fr] items-baseline gap-2">
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400">Untuk Pembayaran</p>
          <p className="text-[10px] font-semibold leading-snug text-slate-800">{receipt.forPaymentOf}</p>
        </div>
        {isPartial && (
          <p className="tnum mt-2 inline-block border border-amber-300 px-2.5 py-1 text-[8px] font-semibold text-amber-700">
            Pembayaran sebagian — sisa tagihan Rp {formatNumber(remaining)} dari Rp {formatNumber(invoiceTotalValue)}
          </p>
        )}
      </section>

      <TerbilangBlock className="mt-4 max-w-[420px]" text={terbilang(receipt.amount)} />

      <SignatureBlock
        settings={settings}
        dateISO={receipt.date}
        token={receipt.token}
        hash={receipt.hash}
        qrValue={validationUrl(receipt.token)}
      />

      <DocumentFooter settings={settings} />
    </DocumentSheet>
  );
}
