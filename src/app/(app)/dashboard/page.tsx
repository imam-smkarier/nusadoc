"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  FilePlus2,
  FileText,
  Receipt,
  ScrollText,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Badge, Card, CardHeader, INVOICE_BADGE, QUOTATION_BADGE, StatCard } from "@/components/ui/primitives";
import { computeInvoiceStatus, effectiveQuotationStatus, invoiceGrandTotal, paymentSummaryOf, quotationTotals } from "@/lib/calc";
import { useApp } from "@/lib/store";
import { useCan } from "@/lib/auth";
import { formatDateShort, formatRupiah, formatRupiahShort, todayISO } from "@/lib/utils";

export default function DashboardPage() {
  const { data, clientById } = useApp();
  const canQuo = useCan("quotation.write");
  const canInv = useCan("invoice.write");
  const now = new Date();
  const month = now.toISOString().slice(0, 7);

  const activeQuo = data.quotations.filter((q) => ["draft", "sent"].includes(effectiveQuotationStatus(q)));
  const activeQuoValue = activeQuo.reduce((s, q) => s + quotationTotals(q).total, 0);
  const unpaid = data.invoices.filter((i) => {
    const st = computeInvoiceStatus(i, data.payments);
    return st === "sent" || st === "partial" || st === "overdue";
  });
  const outstanding = unpaid.reduce((s, i) => s + paymentSummaryOf(i, data.payments).outstanding, 0);
  const overdue = data.invoices.filter((i) => computeInvoiceStatus(i, data.payments) === "overdue");
  const receivedThisMonth = data.payments
    .filter((p) => p.date.startsWith(month))
    .reduce((s, p) => s + p.amount, 0);

  const recentQuo = [...data.quotations].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).slice(0, 5);
  const recentInv = [...data.invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        desc="Ringkasan alur dokumen PT. SMKarier Inovasi Digital — data demo lokal."
        actions={
          <>
            {canQuo && (
            <Link href="/penawaran/baru">
              <span className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark">
                <FilePlus2 className="h-4 w-4" /> Buat Penawaran
              </span>
            </Link>
            )}
            {canInv && (
            <Link href="/invoice/baru">
              <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-brand hover:text-brand">
                <Receipt className="h-4 w-4" /> Buat Invoice
              </span>
            </Link>
            )}
          </>
        }
      />

      <div className="space-y-5 p-5 lg:p-7">
        {/* Stat */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            <StatCard key="q" icon={<FileText className="h-4.5 w-4.5" />} label="Penawaran Aktif" value={activeQuo.length} sub={`${formatRupiahShort(activeQuoValue)} nilai tawaran`} tone="blue" />,
            <StatCard key="i" icon={<Receipt className="h-4.5 w-4.5" />} label="Invoice Belum Dibayar" value={unpaid.length} sub={`${formatRupiahShort(outstanding)} outstanding`} tone="orange" />,
            <StatCard key="o" icon={<Clock className="h-4.5 w-4.5" />} label="Jatuh Tempo" value={overdue.length} sub="perlu ditagih ulang" tone="red" />,
            <StatCard key="r" icon={<Wallet className="h-4.5 w-4.5" />} label="Diterima Bulan Ini" value={formatRupiahShort(receivedThisMonth)} sub={`${data.payments.length} kwitansi terbit`} tone="green" />,
          ].map((card, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              {card}
            </motion.div>
          ))}
        </div>

        {/* Alur dokumen */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
          <Card className="overflow-hidden">
            <CardHeader title="Alur Dokumen" desc="Satu jalur: turunan otomatis membawa data induk — tanpa input ulang." />
            <div className="flex flex-wrap items-stretch gap-3 p-5">
              {[
                { icon: Users, title: "Master Klien", desc: "Data & PIC tersimpan", href: "/klien" },
                { icon: FileText, title: "Penawaran", desc: "Builder + preview A4", href: "/penawaran/baru" },
                { icon: Receipt, title: "Invoice", desc: "Multi-termin (DP/progres)", href: "/invoice/baru" },
                { icon: ScrollText, title: "Kwitansi", desc: "Otomatis per pembayaran", href: "/kwitansi" },
              ].map((s, i, arr) => (
                <div key={s.title} className="flex flex-1 items-center gap-3">
                  <Link href={s.href} className="group flex flex-1 items-center gap-3 rounded-xl border border-line bg-white p-3.5 transition-colors hover:border-brand/50">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-navy group-hover:text-brand">{s.title}</span>
                      <span className="block truncate text-[11.5px] text-slate-500">{s.desc}</span>
                    </span>
                  </Link>
                  {i < arr.length - 1 && <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-300 xl:block" />}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Dua list */}
        <div className="grid gap-4 xl:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card>
              <CardHeader title="Penawaran Terbaru" action={<Link href="/penawaran" className="text-[12.5px] font-semibold text-brand hover:underline">Lihat semua</Link>} />
              <ul className="divide-y divide-line">
                {recentQuo.map((q) => {
                  const st = QUOTATION_BADGE[effectiveQuotationStatus(q)];
                  return (
                    <li key={q.id}>
                      <Link href={`/penawaran/${q.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-canvas/60">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-slate-500">
                          <FileText className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="tnum block truncate text-[12px] font-semibold text-slate-500">{q.number}</span>
                          <span className="block truncate text-[13.5px] font-medium text-navy">
                            {clientById(q.clientId)?.name ?? "—"}
                          </span>
                        </span>
                        <span className="hidden text-right sm:block">
                          <span className="tnum block text-[13px] font-semibold text-navy">{formatRupiah(quotationTotals(q).total)}</span>
                          <span className="tnum block text-[11.5px] text-slate-400">{formatDateShort(q.date)}</span>
                        </span>
                        <Badge tone={st.tone} dot>{st.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
            <Card>
              <CardHeader title="Invoice Terbaru" action={<Link href="/invoice" className="text-[12.5px] font-semibold text-brand hover:underline">Lihat semua</Link>} />
              <ul className="divide-y divide-line">
                {recentInv.map((inv) => {
                  const st = INVOICE_BADGE[computeInvoiceStatus(inv, data.payments)];
                  return (
                    <li key={inv.id}>
                      <Link href={`/invoice/${inv.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-canvas/60">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-slate-500">
                          <Receipt className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="tnum block truncate text-[12px] font-semibold text-slate-500">{inv.number}</span>
                          <span className="block truncate text-[13.5px] font-medium text-navy">
                            {clientById(inv.clientId)?.name ?? "—"}
                          </span>
                        </span>
                        <span className="hidden text-right sm:block">
                          <span className="tnum block text-[13px] font-semibold text-navy">{formatRupiah(invoiceGrandTotal(inv))}</span>
                          <span className="tnum block text-[11.5px] text-slate-400">
                            JT {formatDateShort(inv.dueDate)}
                          </span>
                        </span>
                        <Badge tone={st.tone} dot>{st.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </motion.div>
        </div>

        {/* Aktivitas kwitansi */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader title="Pembayaran & Kwitansi Terakhir" action={<Link href="/kwitansi" className="text-[12.5px] font-semibold text-brand hover:underline">Semua kwitansi</Link>} />
            <ul className="divide-y divide-line">
              {[...data.receipts]
                .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
                .slice(0, 4)
                .map((r) => (
                  <li key={r.id}>
                    <Link href={`/kwitansi/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas/60">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <BadgeCheck className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="tnum block truncate text-[12.5px] font-semibold text-slate-600">{r.number} · {r.method}</span>
                        <span className="block truncate text-[12px] text-slate-400">{r.forPaymentOf}</span>
                      </span>
                      <span className="tnum shrink-0 text-[13.5px] font-bold text-emerald-700">+{formatRupiah(r.amount)}</span>
                    </Link>
                  </li>
                ))}
              {data.receipts.length === 0 && (
                <li className="px-5 py-6 text-center text-[13px] text-slate-400">Belum ada pembayaran tercatat.</li>
              )}
            </ul>
          </Card>
        </motion.div>

        <p className="tnum pb-2 text-center text-[11.5px] text-slate-400">
          Hari ini {formatDateShort(todayISO())} · mockup frontend — data tersimpan di localStorage browser ini
        </p>
      </div>
    </>
  );
}
