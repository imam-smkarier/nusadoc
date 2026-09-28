"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Badge, Card, EmptyState, QUOTATION_BADGE } from "@/components/ui/primitives";
import { effectiveQuotationStatus, quotationTotals } from "@/lib/calc";
import { useApp } from "@/lib/store";
import { useCan } from "@/lib/auth";
import type { QuotationStatus } from "@/lib/types";
import { cn, formatDateShort, formatRupiah } from "@/lib/utils";

const FILTERS: Array<{ key: "all" | QuotationStatus; label: string }> = [
  { key: "all", label: "Semua" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Terkirim" },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak" },
  { key: "expired", label: "Kedaluwarsa" },
];

export default function PenawaranListPage() {
  const { data, clientById, invoicesForQuotation } = useApp();
  const canQuo = useCan("quotation.write");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    let list = [...data.quotations].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    if (filter !== "all") list = list.filter((q) => effectiveQuotationStatus(q) === filter);
    const q = query.trim().toLowerCase();
    if (q)
      list = list.filter(
        (x) =>
          x.number.toLowerCase().includes(q) ||
          x.subject.toLowerCase().includes(q) ||
          (clientById(x.clientId)?.name.toLowerCase().includes(q) ?? false)
      );
    return list;
  }, [data.quotations, filter, query, clientById]);

  return (
    <>
      <PageHeader
        title="Penawaran"
        desc="Dokumen penawaran harga — status turunan bisa lahir menjadi banyak invoice per termin."
        actions={
          canQuo && (
          <Link
            href="/penawaran/baru"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" /> Buat Penawaran
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
            <EmptyState icon={<FileText className="h-6 w-6" />} title="Tidak ada penawaran" desc="Ubah filter atau buat penawaran baru." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-b border-line bg-canvas text-[11.5px] uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Nomor</th>
                    <th className="px-3 py-3 font-semibold">Klien / Perihal</th>
                    <th className="px-3 py-3 font-semibold">Tanggal</th>
                    <th className="px-3 py-3 font-semibold">Berlaku s.d.</th>
                    <th className="px-3 py-3 text-right font-semibold">Nilai</th>
                    <th className="px-3 py-3 text-center font-semibold">Invoice</th>
                    <th className="px-5 py-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((q) => {
                    const st = QUOTATION_BADGE[effectiveQuotationStatus(q)];
                    const invs = invoicesForQuotation(q.id);
                    return (
                      <tr key={q.id} className="transition-colors hover:bg-canvas/50">
                        <td className="px-5 py-3.5">
                          <Link href={`/penawaran/${q.id}`} className="tnum text-[12.5px] font-bold text-brand hover:underline">
                            {q.number}
                          </Link>
                        </td>
                        <td className="max-w-[280px] px-3 py-3.5">
                          <span className="block text-[13.5px] font-semibold text-navy">{clientById(q.clientId)?.name ?? "—"}</span>
                          <span className="block truncate text-[12px] text-slate-500">{q.subject}</span>
                        </td>
                        <td className="tnum px-3 py-3.5 text-[12.5px] text-slate-600">{formatDateShort(q.date)}</td>
                        <td className="tnum px-3 py-3.5 text-[12.5px] text-slate-600">{formatDateShort(q.validUntil)}</td>
                        <td className="tnum px-3 py-3.5 text-right text-[13px] font-semibold text-navy">{formatRupiah(quotationTotals(q).total)}</td>
                        <td className="tnum px-3 py-3.5 text-center text-[12.5px] font-semibold text-slate-600">{invs.length}</td>
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
