"use client";

import { Badge, INVOICE_BADGE } from "@/components/ui/primitives";
import { computeInvoiceStatus, computeTotals } from "@/lib/calc";
import { terbilang } from "@/lib/terbilang";
import { validationUrl } from "@/lib/token";
import type { Client, CompanySettings, Invoice, Payment, Quotation } from "@/lib/types";
import { formatDateShort, formatNumber } from "@/lib/utils";
import { DocumentFooter } from "./DocumentFooter";
import { DocumentHeader } from "./DocumentHeader";
import { LineItemTable } from "./LineItemTable";
import { PartyBlock } from "./PartyBlock";
import { SignatureBlock } from "./SignatureBlock";
import { TerbilangBlock, TotalsPanel } from "./TotalsPanel";
import { DocumentSheet } from "./DocumentSheet";

/** Lembar INVOICE — carry-over dari penawaran (referensi induk wajib) atau langsung. */
export function InvoiceSheet({
  invoice,
  client,
  quotation,
  settings,
  payments = [],
  mode = "final",
}: {
  invoice: Invoice;
  client?: Client;
  quotation?: Quotation;
  settings: CompanySettings;
  payments?: Payment[];
  mode?: "final" | "preview";
}) {
  const totals = computeTotals(invoice.items, invoice.tax);
  const isPreview = mode === "preview";
  const status = isPreview ? "sent" : computeInvoiceStatus(invoice, payments);
  const badgeInfo = INVOICE_BADGE[status];

  return (
    <DocumentSheet>
      <DocumentHeader
        settings={settings}
        title="INVOICE"
        docLabel="Tagihan · Nusadoc"
        number={isPreview ? "NTS/INV/…/—" : invoice.number}
        dateLine={`Tanggal ${formatDateShort(invoice.date)} · Jatuh Tempo ${formatDateShort(invoice.dueDate)}`}
        badge={
          <Badge tone={badgeInfo.tone} dot>
            {isPreview ? "PRATINJAU DRAFT" : badgeInfo.label.toUpperCase()}
          </Badge>
        }
      />

      <PartyBlock
        partyLabel="Kepada Yth."
        client={client}
        metaRows={[
          { label: "Nomor", value: isPreview ? "NTS/INV/…/—" : invoice.number },
          { label: "Tanggal", value: formatDateShort(invoice.date) },
          { label: "Jatuh Tempo", value: formatDateShort(invoice.dueDate) },
          ...(invoice.terminLabel ? [{ label: "Termin", value: `${invoice.terminLabel} (${invoice.terminPct}%)` }] : []),
        ]}
        reference={
          quotation
            ? {
                label: "Referensi Penawaran",
                number: quotation.number,
                note: `Disetujui · ${formatDateShort(quotation.date)}`,
              }
            : invoice.quotationId
              ? { label: "Referensi Penawaran", number: "—" }
              : null
        }
      />

      <section className="avoid-break mt-4">
        <p className="text-[9.5px] font-semibold text-navy">
          Untuk pembayaran: <span className="font-bold">{invoice.subject || "—"}</span>
        </p>
      </section>

      <div className="mt-3">
        <LineItemTable
          items={invoice.items}
          footNote={
            invoice.terminLabel && quotation
              ? `Nilai proporsional ${invoice.terminLabel} (${invoice.terminPct}%) atas Penawaran ${quotation.number}.`
              : undefined
          }
        />
      </div>

      <div className="mt-3 flex items-start justify-between gap-6">
        <div className="max-w-[400px]">
          {invoice.notes && (
            <p className="whitespace-pre-line text-[8.5px] leading-[1.7] text-slate-600">{invoice.notes}</p>
          )}
          <div className="avoid-break mt-3">
            <p className="text-[7.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Pembayaran Melalui</p>
            {settings.banks.map((b) => (
              <p key={b.id} className="tnum mt-1 text-[8.5px] leading-snug text-slate-600">
                <span className="font-semibold text-slate-700">{b.bank}</span> {b.number} a.n. {b.holder}
              </p>
            ))}
          </div>
          <TerbilangBlock className="mt-3 max-w-[340px]" text={terbilang(totals.total)} />
        </div>
        <TotalsPanel totals={totals} />
      </div>

      <SignatureBlock
        settings={settings}
        dateISO={invoice.date}
        token={invoice.token}
        hash={invoice.hash}
        qrValue={isPreview ? "https://nusadoc.id/v/DRAFT" : validationUrl(invoice.token)}
      />

      <DocumentFooter settings={settings} />
    </DocumentSheet>
  );
}

/** Ringkasan nominal kecil untuk dokumen kwitansi. */
export function InvoiceAmountInline({ invoice }: { invoice: Invoice }) {
  const t = computeTotals(invoice.items, invoice.tax);
  return (
    <span className="tnum">
      Rp {formatNumber(t.total)}
    </span>
  );
}
