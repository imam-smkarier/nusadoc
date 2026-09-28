"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, CheckCheck, FilePlus2, Printer, Send } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { ValidationCard } from "@/components/app/ValidationCard";
import { DocPreview } from "@/components/documents/DocumentSheet";
import { QuotationSheet } from "@/components/documents/QuotationSheet";
import { Badge, Button, Card, CardHeader, EmptyState, QUOTATION_BADGE } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Modal";
import { effectiveQuotationStatus, invoiceGrandTotal, quotationTotals } from "@/lib/calc";
import { useApp } from "@/lib/store";
import { useCan } from "@/lib/auth";
import type { QuotationStatus } from "@/lib/types";
import { formatDateShort, formatRupiah } from "@/lib/utils";
import { partiesFromDoc } from "@/lib/types";

export default function PenawaranDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, clientById, quotationById, invoicesForQuotation, setQuotationStatus } = useApp();
  const canSend = useCan("quotation.send");
  const canDecide = useCan("quotation.decide");
  const canInv = useCan("invoice.write");
  const toast = useToast();
  const quotation = quotationById(id);

  if (!quotation) {
    return (
      <EmptyState
        title="Penawaran tidak ditemukan"
        action={
          <Link href="/penawaran" className="text-[13px] font-semibold text-brand hover:underline">
            ← Kembali ke daftar penawaran
          </Link>
        }
      />
    );
  }

  // Dokumen historis dirender dari snapshot saat terbit (bukan master terkini).
  const snap = partiesFromDoc(quotation);
  const client = snap?.client ?? clientById(quotation.clientId);
  const settingsRender = snap?.settings ?? data.settings;
  const status = effectiveQuotationStatus(quotation);
  const badge = QUOTATION_BADGE[status];
  const totals = quotationTotals(quotation);
  const invoices = invoicesForQuotation(quotation.id);

  const act = (next: QuotationStatus, title: string) => {
    setQuotationStatus(quotation.id, next);
    toast({ tone: "success", title, desc: quotation.number });
  };

  return (
    <>
      <PageHeader
        title={quotation.number}
        desc={`${client?.name ?? "—"} · ${quotation.subject}`}
        actions={
          <>
            <Link
              href="/penawaran"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-slate-600 shadow-sm hover:border-brand hover:text-brand"
            >
              <ArrowLeft className="h-4 w-4" /> Daftar
            </Link>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Cetak / PDF
            </Button>

            {status === "draft" && canSend && (
              <Button onClick={() => act("sent", "Penawaran ditandai terkirim")}>
                <Send className="h-4 w-4" /> Kirim ke Klien
              </Button>
            )}
            {status === "sent" && canDecide && (
              <>
                <Button variant="danger" onClick={() => act("rejected", "Penawaran ditolak")}>
                  <Ban className="h-4 w-4" /> Ditolak
                </Button>
                <Button onClick={() => act("approved", "Penawaran disetujui")}>
                  <CheckCheck className="h-4 w-4" /> Setujui
                </Button>
              </>
            )}
            {status === "approved" && canInv && (
              <Link
                href={`/invoice/baru?from=${quotation.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white shadow-sm hover:bg-accent-dark"
              >
                <FilePlus2 className="h-4 w-4" /> Buat Invoice
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-4 p-5 xl:grid-cols-[1fr_330px] lg:p-7">
        {/* Dokumen */}
        <div className="print-area">
          <DocPreview>
            <QuotationSheet quotation={quotation} client={client} settings={settingsRender} />
          </DocPreview>
        </div>

        {/* Rail */}
        <div className="no-print space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[15px] font-semibold text-navy">Status</h3>
              <Badge tone={badge.tone} dot>{badge.label}</Badge>
            </div>
            <dl className="mt-4 space-y-2.5 text-[13px]">
              <Row label="Nilai total" value={formatRupiah(totals.total)} strong />
              <Row label="Tanggal dokumen" value={formatDateShort(quotation.date)} />
              <Row label="Berlaku s.d." value={formatDateShort(quotation.validUntil)} />
              <Row label="Terbit" value={formatDateShort(quotation.issuedAt.slice(0, 10))} />
            </dl>
            <div className="mt-4 rounded-lg border border-dashed border-line bg-canvas/50 px-3.5 py-3 text-[12px] leading-relaxed text-slate-500">
              {status === "draft" && "Masih draft — kirim ke klien saat sudah final. Setelah terbit, isi dokumen terkunci."}
              {status === "sent" && "Menunggu respon klien. Setelah disetujui, tombol Buat Invoice aktif."}
              {status === "approved" && "Disetujui — siap diturunkan menjadi invoice termin (DP / progres / retensi)."}
              {status === "rejected" && "Ditolak klien. Buat penawaran revisi bila diperlukan."}
              {status === "expired" && "Melewati masa berlaku tanpa persetujuan — dihitung otomatis dari tanggal."}
            </div>
          </Card>

          <Card>
            <CardHeader title="Invoice Turunan" desc={`Carry-over penuh dari penawaran ini (${invoices.length} terbit)`} />
            {invoices.length === 0 ? (
              <p className="px-5 py-5 text-[13px] text-slate-400">
                Belum ada invoice{status !== "approved" && " — tombol Buat Invoice aktif saat penawaran Disetujui"}.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {invoices.map((inv) => (
                  <li key={inv.id}>
                    <Link href={`/invoice/${inv.id}`} className="block px-5 py-3 hover:bg-canvas/60">
                      <span className="tnum block text-[12px] font-bold text-brand">{inv.number}</span>
                      <span className="block text-[12.5px] text-slate-600">{inv.terminLabel}</span>
                      <span className="tnum block text-[12px] font-semibold text-navy">{formatRupiah(invoiceGrandTotal(inv))}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <ValidationCard token={quotation.token} />
        </div>
      </div>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`tnum ${strong ? "text-[15px] font-bold text-navy" : "font-medium text-slate-700"}`}>{value}</dd>
    </div>
  );
}
