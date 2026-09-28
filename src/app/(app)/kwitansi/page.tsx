"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { useApp } from "@/lib/store";
import { formatDateShort, formatRupiah } from "@/lib/utils";

export default function KwitansiListPage() {
  const { data, clientById, invoiceById } = useApp();

  const rows = useMemo(
    () => [...data.receipts].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    [data.receipts]
  );

  return (
    <>
      <PageHeader
        title="Kwitansi"
        desc="Bukti penerimaan pembayaran — terbit otomatis saat pembayaran dicatat, sekali terbit final (tanpa draft)."
      />

      <div className="p-5 lg:p-7">
        <Card className="overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-6 w-6" />}
              title="Belum ada kwitansi"
              desc="Kwitansi tidak dibuat manual — catat pembayaran pada sebuah invoice, kwitansi terbit otomatis."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-line bg-canvas text-[11.5px] uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Nomor</th>
                    <th className="px-3 py-3 font-semibold">Diterima Dari</th>
                    <th className="px-3 py-3 font-semibold">Untuk Invoice</th>
                    <th className="px-3 py-3 font-semibold">Tanggal</th>
                    <th className="px-3 py-3 font-semibold">Metode</th>
                    <th className="px-5 py-3 text-right font-semibold">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-canvas/50">
                      <td className="px-5 py-3.5">
                        <Link href={`/kwitansi/${r.id}`} className="tnum text-[12.5px] font-bold text-brand hover:underline">
                          {r.number}
                        </Link>
                      </td>
                      <td className="px-3 py-3.5 text-[13.5px] font-semibold text-navy">{clientById(r.clientId)?.name ?? "—"}</td>
                      <td className="tnum px-3 py-3.5 text-[12.5px] text-slate-600">{invoiceById(r.invoiceId)?.number ?? "—"}</td>
                      <td className="tnum px-3 py-3.5 text-[12.5px] text-slate-600">{formatDateShort(r.date)}</td>
                      <td className="px-3 py-3.5">
                        <Badge tone="slate">{r.method}</Badge>
                      </td>
                      <td className="tnum px-5 py-3.5 text-right text-[13.5px] font-bold text-emerald-700">{formatRupiah(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
