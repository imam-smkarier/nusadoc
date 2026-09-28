"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Badge, Card, EmptyState, INVOICE_BADGE } from "@/components/ui/primitives";
import { computeInvoiceStatus, invoiceGrandTotal, paymentSummaryOf } from "@/lib/calc";
import { useApp } from "@/lib/store";
import { useCan } from "@/lib/auth";
import type { InvoiceStatus } from "@/lib/types";
import { cn, formatDateShort, formatRupiah } from "@/lib/utils";

const FILTERS: Array<{ key: "all" | InvoiceStatus; label: string }> = [
  { key: "all", label: "Semua" },
  { key: "sent", label: "Terkirim" },
  { key: "partial", label: "Terbayar Sebagian" },
  { key: "paid", label: "Lunas" },
  { key: "overdue", label: "Jatuh Tempo" },
];

export default function InvoiceListPage() {
  const { data, clientById } = useApp();
  const canInv = useCan("invoice.write");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    let list = [...data.invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    if (filter !== "all") list = list.filter((i) => computeInvoiceStatus(i, data.payments) === filter);
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter(
        (x) =>
          x.number.toLowerCase().includes(q) ||
          x.subject.toLowerCase().includes(q) ||
          (clientById(x.clientId)?.name.toLowerCase().includes(q) ?? false)
      );
    return list;
  }, [data.invoices, data.payments, filter, query, clientById]);

  const withStatus = (inv: (typeof rows)[number]) => ({
    inv,
    status: computeInvoiceStatus(inv, data.payments),
    sum: paymentSummaryOf(inv, data.payments),
  });

  return (
    <>
      <PageHeader
        title="Invoice"
        desc="Status dihitung otomatis dari akumulasi kwitansi — tidak diubah manual."
        actions={
          canInv && (
          <Link
            href="/invoice/baru"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" /> Buat Invoice
          </Link>
          )
        }
      />

      <div className="p-5 lg:p-7">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
                  filter === f.key
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line bg-white text-slate-500 hover:border-slate-300"
                )}
              >
                {f.label}
              </button>
            ))}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nomor, klien, perihal…"
              className="ml-auto w-56 rounded-lg border border-line px-3 py-1.5 text-[13px] focus:border-brand focus:outline-none"
            />
          </div>

          {rows.length === 0 ? (
            <EmptyState icon={<Receipt className="h-6 w-6" />} title="Tidak ada invoice" desc="Ubah filter atau buat invoice baru." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-line bg-canvas text-[11.5px] uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Nomor</th>
                    <th className="px-3 py-3 font-semibold">Klien / Perihal</th>
                    <th className="px-3 py-3 font-semibold">Jatuh Tempo</th>
                    <th className="px-3 py-3 text-right font-semibold">Nilai</th>
                    <th className="px-3 py-3 text-right font-semibold">Dibayar</th>
                    <th className="px-5 py-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((inv) => {
                    const { status, sum } = withStatus(inv);
                    const st = INVOICE_BADGE[status];
                    return (
                      <tr key={inv.id} className="transition-colors hover:bg-canvas/50">
                        <td className="px-5 py-3.5">
                          <Link href={`/invoice/${inv.id}`} className="tnum text-[12.5px] font-bold text-brand hover:underline">
                            {inv.number}
                          </Link>
                          {inv.terminLabel && <span className="block text-[11px] text-slate-400">{inv.terminLabel}</span>}
                        </td>
                        <td className="max-w-[280px] px-3 py-3.5">
                          <span className="block text-[13.5px] font-semibold text-navy">{clientById(inv.clientId)?.name ?? "—"}</span>
                          <span className="block truncate text-[12px] text-slate-500">{inv.subject}</span>
                        </td>
                        <td className="tnum px-3 py-3.5 text-[12.5px] text-slate-600">{formatDateShort(inv.dueDate)}</td>
                        <td className="tnum px-3 py-3.5 text-right text-[13px] font-semibold text-navy">{formatRupiah(invoiceGrandTotal(inv))}</td>
                        <td className="tnum px-3 py-3.5 text-right text-[13px] font-semibold text-emerald-700">
                          {formatRupiah(sum.paid)}
                          <span className="block text-[10.5px] font-normal text-slate-400">{sum.count} kwitansi</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Badge tone={st.tone} dot>{st.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
