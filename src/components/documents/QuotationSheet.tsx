"use client";

import { Badge, QUOTATION_BADGE } from "@/components/ui/primitives";
import { effectiveQuotationStatus, quotationTotals } from "@/lib/calc";
import { terbilang } from "@/lib/terbilang";
import type { Client, CompanySettings, Quotation } from "@/lib/types";
import { formatDateShort } from "@/lib/utils";
import { validationUrl } from "@/lib/token";
import { DocumentFooter } from "./DocumentFooter";
import { DocumentHeader } from "./DocumentHeader";
import { LineItemTable } from "./LineItemTable";
import { PartyBlock } from "./PartyBlock";
import { SignatureBlock } from "./SignatureBlock";
import { TerbilangBlock, TotalsPanel } from "./TotalsPanel";
import { DocumentSheet } from "./DocumentSheet";

/** Lembar PENAWARAN — dipakai builder (mode preview) & halaman detail (final). */
export function QuotationSheet({
  quotation,
  client,
  settings,
  mode = "final",
}: {
  quotation: Quotation;
  client?: Client;
  settings: CompanySettings;
  mode?: "final" | "preview";
}) {
  const totals = quotationTotals(quotation);
  const isPreview = mode === "preview";
  const badgeInfo = QUOTATION_BADGE[isPreview ? "draft" : effectiveQuotationStatus(quotation)];

  return (
    <DocumentSheet>
      <DocumentHeader
        settings={settings}
        title="PENAWARAN"
        docLabel="Quotation · Nafiga DocFlow"
        number={isPreview ? "NTS/QUO/…/—" : quotation.number}
        dateLine={`Tanggal ${formatDateShort(quotation.date)} · Berlaku s.d. ${formatDateShort(quotation.validUntil)}`}
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
          { label: "Nomor", value: isPreview ? "NTS/QUO/…/—" : quotation.number },
          { label: "Tanggal", value: formatDateShort(quotation.date) },
          { label: "Masa Berlaku", value: `s.d. ${formatDateShort(quotation.validUntil)}` },
        ]}
      />

      <section className="avoid-break mt-4">
        <p className="text-[9.5px] font-semibold text-navy">
          Perihal: <span className="font-bold">{quotation.subject || "—"}</span>
        </p>
        <p className="mt-1 text-[9px] leading-[1.65] text-slate-600">
          Dengan hormat, bersama surat ini kami sampaikan penawaran harga untuk kebutuhan yang Bapak/Ibu
          informasikan, sebagai berikut:
        </p>
      </section>

      <div className="mt-3">
        <LineItemTable items={quotation.items} />
      </div>

      <div className="mt-3 flex items-start justify-between gap-6">
        <div className="max-w-[400px]">
          {quotation.notes && (
            <div className="avoid-break">
              <p className="text-[7.5px] font-bold uppercase tracking-[0.16em] text-slate-400">Syarat & Ketentuan</p>
              <p className="mt-1 whitespace-pre-line text-[8.5px] leading-[1.7] text-slate-600">{quotation.notes}</p>
            </div>
          )}
          <TerbilangBlock className="mt-3 max-w-[340px]" text={terbilang(totals.total)} />
        </div>
        <TotalsPanel totals={totals} />
      </div>

      <SignatureBlock
        settings={settings}
        dateISO={quotation.date}
        counterLabel="Menyetujui,"
        token={quotation.token}
        hash={quotation.hash}
        qrValue={isPreview ? "https://docflow.nafiga.co.id/v/DRAFT" : validationUrl(quotation.token)}
      />

      <DocumentFooter settings={settings} />
    </DocumentSheet>
  );
}
