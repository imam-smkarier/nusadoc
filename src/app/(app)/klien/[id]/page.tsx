"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, FilePlus2, MapPin, Mail, Phone, Wallet } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Badge, Card, CardHeader, EmptyState, INVOICE_BADGE, QUOTATION_BADGE } from "@/components/ui/primitives";
import { computeInvoiceStatus, effectiveQuotationStatus, invoiceGrandTotal, paymentSummaryOf, quotationTotals } from "@/lib/calc";
import { useApp } from "@/lib/store";
import { formatDateShort, formatRupiah } from "@/lib/utils";

export default function KlienDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { clientById, data } = useApp();
  const client = clientById(id);

  const quotations = useMemo(
    () => data.quotations.filter((q) => q.clientId === id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    [data.quotations, id]
  );
  const invoices = useMemo(
    () => data.invoices.filter((i) => i.clientId === id).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    [data.invoices, id]
  );
  const totalBilled = invoices.reduce((s, i) => s + invoiceGrandTotal(i), 0);
  const totalPaid = invoices.reduce((s, i) => s + paymentSummaryOf(i, data.payments).paid, 0);

  if (!client) {
    return (
      <EmptyState
        title="Klien tidak ditemukan"
        desc="Klien mungkin telah dihapus dari data demo."
        action={
          <Link href="/klien" className="text-[13px] font-semibold text-brand hover:underline">
            ← Kembali ke daftar klien
          </Link>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title={client.name}
        desc={`Kode ${client.code} · klien sejak ${formatDateShort(client.createdAt)}`}
        actions={
          <>
            <Link
              href="/klien"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-slate-600 shadow-sm hover:border-brand hover:text-brand"
            >
              <ArrowLeft className="h-4 w-4" /> Daftar Klien
            </Link>
            <Link
              href={`/penawaran/baru?client=${client.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-dark"
            >
              <FilePlus2 className="h-4 w-4" /> Buat Penawaran
            </Link>
          </>
        }
      />

      <div className="grid gap-4 p-5 lg:grid-cols-[340px_1fr] lg:p-7">
        {/* Profil */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-display text-[15px] font-semibold text-navy">Profil</h3>
            <dl className="mt-3 space-y-3 text-[13px]">
              <div className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <dd className="text-slate-600">
                  {client.address}
                  {client.city && <>, {client.city}</>}
                </dd>
              </div>
              <div className="flex gap-2.5">
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <dd className="tnum text-slate-600">NPWP {client.npwp}</dd>
              </div>
              <div className="flex gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <dd className="tnum text-slate-600">
                  {client.picName} · {client.picPhone}
                </dd>
              </div>
              <div className="flex gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <dd className="break-all text-slate-600">{client.picEmail}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="font-display text-[15px] font-semibold text-navy">Ringkasan Nilai</h3>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-500">Total ditagihkan</span>
                <span className="tnum font-semibold text-navy">{formatRupiah(totalBilled)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-500">Sudah dibayar</span>
                <span className="tnum font-semibold text-emerald-700">{formatRupiah(totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2.5 text-[13px]">
                <span className="text-slate-500">Outstanding</span>
                <span className="tnum font-bold text-accent-dark">{formatRupiah(totalBilled - totalPaid)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Riwayat dokumen */}
        <div className="space-y-4">
          <Card>
            <CardHeader title={`Penawaran (${quotations.length})`} />
            {quotations.length === 0 ? (
              <EmptyState title="Belum ada penawaran" desc="Buat penawaran pertama untuk klien ini." />
            ) : (
              <ul className="divide-y divide-line">
                {quotations.map((q) => {
                  const st = QUOTATION_BADGE[effectiveQuotationStatus(q)];
                  return (
                    <li key={q.id}>
                      <Link href={`/penawaran/${q.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-canvas/60">
                        <span className="min-w-0 flex-1">
                          <span className="tnum block text-[12px] font-semibold text-slate-500">{q.number}</span>
                          <span className="block truncate text-[13.5px] font-medium text-navy">{q.subject}</span>
                        </span>
                        <span className="tnum shrink-0 text-[13.5px] font-semibold text-navy">{formatRupiah(quotationTotals(q).total)}</span>
                        <Badge tone={st.tone} dot>{st.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title={`Invoice (${invoices.length})`} />
            {invoices.length === 0 ? (
              <EmptyState title="Belum ada invoice" desc="Invoice bisa lahir dari penawaran yang disetujui." />
            ) : (
              <ul className="divide-y divide-line">
                {invoices.map((inv) => {
                  const st = INVOICE_BADGE[computeInvoiceStatus(inv, data.payments)];
                  const sum = paymentSummaryOf(inv, data.payments);
                  return (
                    <li key={inv.id}>
                      <Link href={`/invoice/${inv.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-canvas/60">
                        <span className="min-w-0 flex-1">
                          <span className="tnum block text-[12px] font-semibold text-slate-500">{inv.number}</span>
                          <span className="block truncate text-[13.5px] font-medium text-navy">{inv.subject}</span>
                          <span className="tnum block text-[11.5px] text-slate-400">
                            Dibayar {formatRupiah(sum.paid)} dari {formatRupiah(sum.total)}
                          </span>
                        </span>
                        <Badge tone={st.tone} dot>{st.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
