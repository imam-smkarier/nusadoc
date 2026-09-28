"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, ScrollText, Wallet } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { ValidationCard } from "@/components/app/ValidationCard";
import { DocPreview } from "@/components/documents/DocumentSheet";
import { InvoiceSheet } from "@/components/documents/InvoiceSheet";
import { PaymentDialog } from "@/components/documents/PaymentDialog";
import { Badge, Button, Card, CardHeader, EmptyState, INVOICE_BADGE } from "@/components/ui/primitives";
import { computeInvoiceStatus, invoiceGrandTotal, paymentSummaryOf, quotationTotals } from "@/lib/calc";
import { useApp } from "@/lib/store";
import { useCan } from "@/lib/auth";
import { formatDateShort, formatRupiah } from "@/lib/utils";
import { partiesFromDoc } from "@/lib/types";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, clientById, invoiceById, quotationById, paymentsForInvoice } = useApp();
  const canPay = useCan("payment.write");
  const invoice = invoiceById(id);

  if (!invoice) {
    return (
      <EmptyState
        title="Invoice tidak ditemukan"
        action={
          <Link href="/invoice" className="text-[13px] font-semibold text-brand hover:underline">
            ← Kembali ke daftar invoice
          </Link>
        }
      />
    );
  }

  const snap = partiesFromDoc(invoice);
  const client = snap?.client ?? clientById(invoice.clientId);
  const settingsRender = snap?.settings ?? data.settings;
  const quotation = quotationById(invoice.quotationId);
  const status = computeInvoiceStatus(invoice, data.payments);
  const badge = INVOICE_BADGE[status];
  const sum = paymentSummaryOf(invoice, data.payments);
  const payments = paymentsForInvoice(invoice.id);

  return (
    <>
      <PageHeader
        title={invoice.number}
        desc={`${client?.name ?? "—"} · ${invoice.subject}${invoice.terminLabel ? ` · ${invoice.terminLabel}` : ""}`}
        actions={
          <>
            <Link
              href="/invoice"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-slate-600 shadow-sm hover:border-brand hover:text-brand"
            >
              <ArrowLeft className="h-4 w-4" /> Daftar
            </Link>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Cetak / PDF
            </Button>
            {status !== "paid" && canPay && <PaymentDialogLauncher invoiceId={invoice.id} />}
          </>
        }
      />

      <div className="grid gap-4 p-5 xl:grid-cols-[1fr_330px] lg:p-7">
        <div className="print-area">
          <DocPreview>
            <InvoiceSheet
              invoice={invoice}
              client={client}
              quotation={quotation}
              settings={settingsRender}
              payments={data.payments}
            />
          </DocPreview>
        </div>

        <div className="no-print space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[15px] font-semibold text-navy">Status Pembayaran</h3>
              <Badge tone={badge.tone} dot>{badge.label}</Badge>
            </div>

            {/* Progres pembayaran */}
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="tnum text-[15px] font-bold text-navy">{formatRupiah(sum.paid)}</span>
                <span className="tnum text-[12px] text-slate-400">dari {formatRupiah(sum.total)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, (sum.paid / sum.total) * 100)}%` }}
                />
              </div>
              <p className="tnum mt-2 text-[12px] text-slate-500">
                Sisa {formatRupiah(sum.outstanding)} · jatuh tempo {formatDateShort(invoice.dueDate)}
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-dashed border-line bg-canvas/50 px-3.5 py-3 text-[12px] leading-relaxed text-slate-500">
              Status invoice <b>tidak bisa diubah manual</b> — dihitung otomatis dari akumulasi kwitansi: Terkirim →
              Terbayar Sebagian → Lunas, atau Jatuh Tempo bila lewat tanggal.
            </div>
          </Card>

          <Card>
            <CardHeader title="Kwitansi" desc={`${payments.length} pembayaran tercatat`} />
            {payments.length === 0 ? (
              <p className="px-5 py-5 text-[13px] text-slate-400">
                Belum ada pembayaran. Klik <b>Catat Pembayaran</b> — kwitansi terbit otomatis.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {payments.map((p) => (
                  <li key={p.id}>
                    <Link href={`/kwitansi/${p.receiptId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas/60">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Wallet className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="tnum block text-[13px] font-bold text-emerald-700">+{formatRupiah(p.amount)}</span>
                        <span className="tnum block text-[11.5px] text-slate-400">
                          {formatDateShort(p.date)} · {p.method}
                        </span>
                      </span>
                      <ScrollText className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {quotation && (
            <Card className="p-5">
              <h3 className="font-display text-[15px] font-semibold text-navy">Referensi Induk</h3>
              <Link href={`/penawaran/${quotation.id}`} className="mt-2.5 block rounded-lg border border-line bg-canvas/60 px-3.5 py-3 hover:border-brand/50">
                <span className="tnum block text-[12px] font-bold text-brand">{quotation.number}</span>
                <span className="block truncate text-[12.5px] text-slate-600">{quotation.subject}</span>
                <span className="tnum block text-[11.5px] text-slate-400">
                  {formatDateShort(quotation.date)} · {formatRupiah(quotationTotals(quotation).total)}
                </span>
              </Link>
            </Card>
          )}

          <ValidationCard token={invoice.token} />
        </div>
      </div>
    </>
  );
}

/** Tombol + dialog catat pembayaran (dipisah agar state dialog lokal). */
function PaymentDialogLauncher({ invoiceId }: { invoiceId: string }) {
  const [open, setOpen] = useState(false);
  const { invoiceById } = useApp();
  const invoice = invoiceById(invoiceId);
  if (!invoice) return null;
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-accent hover:bg-accent-dark"
      >
        <Wallet className="h-4 w-4" /> Catat Pembayaran
      </Button>
      <PaymentDialog invoice={invoice} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
