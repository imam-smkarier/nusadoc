"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { ValidationCard } from "@/components/app/ValidationCard";
import { DocPreview } from "@/components/documents/DocumentSheet";
import { ReceiptSheet } from "@/components/documents/ReceiptSheet";
import { Badge, Button, Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { useApp } from "@/lib/store";
import { formatDateShort, formatRupiah } from "@/lib/utils";
import { partiesFromDoc } from "@/lib/types";

export default function KwitansiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, clientById, receiptById, invoiceById } = useApp();
  const receipt = receiptById(id);

  if (!receipt) {
    return (
      <EmptyState
        title="Kwitansi tidak ditemukan"
        action={
          <Link href="/kwitansi" className="text-[13px] font-semibold text-brand hover:underline">
            ← Kembali ke daftar kwitansi
          </Link>
        }
      />
    );
  }

  const invoice = invoiceById(receipt.invoiceId);
  const snap = partiesFromDoc(receipt);
  const client = snap?.client ?? clientById(receipt.clientId);
  const settingsRender = snap?.settings ?? data.settings;
  const payment = data.payments.find((p) => p.id === receipt.paymentId);

  return (
    <>
      <PageHeader
        title={receipt.number}
        desc={`${client?.name ?? "—"} · ${formatRupiah(receipt.amount)} · ${formatDateShort(receipt.date)}`}
        actions={
          <>
            <Link
              href="/kwitansi"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-slate-600 shadow-sm hover:border-brand hover:text-brand"
            >
              <ArrowLeft className="h-4 w-4" /> Daftar
            </Link>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Cetak / PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-4 p-5 xl:grid-cols-[1fr_330px] lg:p-7">
        <div className="print-area">
          <DocPreview>
            <ReceiptSheet
              receipt={receipt}
              invoice={invoice}
              client={client}
              settings={settingsRender}
              paidTotal={
                data.payments
                  .filter((p) => p.invoiceId === receipt.invoiceId && p.date <= receipt.date)
                  .reduce((s, p) => s + p.amount, 0) || undefined
              }
            />
          </DocPreview>
        </div>

        <div className="no-print space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-[15px] font-semibold text-navy">Bukti Pembayaran</h3>
              <Badge tone="green" dot>TERBIT FINAL</Badge>
            </div>
            <dl className="mt-4 space-y-2.5 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Jumlah diterima</dt>
                <dd className="tnum text-[15px] font-bold text-emerald-700">{formatRupiah(receipt.amount)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Metode</dt>
                <dd className="font-medium text-slate-700">{receipt.method}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Tanggal</dt>
                <dd className="tnum font-medium text-slate-700">{formatDateShort(receipt.date)}</dd>
              </div>
              {payment?.note && (
                <div className="border-t border-line pt-2.5 text-[12px] leading-relaxed text-slate-500">“{payment.note}”</div>
              )}
            </dl>
            <p className="mt-4 rounded-lg border border-dashed border-line bg-canvas/50 px-3.5 py-3 text-[12px] leading-relaxed text-slate-500">
              Kwitansi <b>tanpa draft</b>: lahir otomatis bersama pencatatan pembayaran dan langsung final — nomor,
              token & hash terkunci sejak terbit.
            </p>
          </Card>

          {invoice && (
            <Card>
              <CardHeader title="Referensi Induk" />
              <div className="p-5 pt-3">
                <Link href={`/invoice/${invoice.id}`} className="block rounded-lg border border-line bg-canvas/60 px-3.5 py-3 hover:border-brand/50">
                  <span className="tnum block text-[12px] font-bold text-brand">{invoice.number}</span>
                  <span className="block truncate text-[12.5px] text-slate-600">{invoice.subject}</span>
                </Link>
              </div>
            </Card>
          )}

          <ValidationCard token={receipt.token} />
        </div>
      </div>
    </>
  );
}
