"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { BadgeCheck, Hash, Printer, ShieldX } from "lucide-react";
import { DocPreview } from "@/components/documents/DocumentSheet";
import { InvoiceSheet } from "@/components/documents/InvoiceSheet";
import { QuotationSheet } from "@/components/documents/QuotationSheet";
import { ReceiptSheet } from "@/components/documents/ReceiptSheet";
import { Badge, Button, Card, Spinner } from "@/components/ui/primitives";
import { computeTotals } from "@/lib/calc";
import type { Client, CompanySettings, Invoice, LineItem, Payment, Quotation, Receipt, TaxConfig } from "@/lib/types";
import { partiesFromDoc } from "@/lib/types";
import { formatDateLong, formatDateShort, formatRupiah } from "@/lib/utils";

type ValidateResponse = {
  found: boolean;
  kind?: "quotation" | "invoice" | "receipt";
  doc?: Record<string, unknown>;
  liveClient?: Client | null;
  client?: Client | null;
  settings?: CompanySettings | null;
  quotationRef?: { number: string; date: string; subject: string } | null;
  invoiceRef?: Invoice | null;
  payments?: Payment[];
  meta?: { total: number };
};

const KIND_LABEL = { quotation: "Penawaran", invoice: "Invoice", receipt: "Kwitansi" } as const;

/**
 * Halaman validasi publik — memakai endpoint TOKEN-SCOPED
 * (/api/public/validate/[token]), BUKAN bootstrap internal.
 * Hash dokumen diverifikasi ulang di server.
 */
export function ValidateClient({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "valid" | "notfound">("loading");
  const [data, setData] = useState<ValidateResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/validate/${encodeURIComponent(token)}`, { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as ValidateResponse;
          if (json.found) {
            setData(json);
            setState("valid");
            return;
          }
        }
        setState("notfound");
      } catch {
        setState("notfound");
      }
    })();
  }, [token]);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Image src="/images/brand/nusadoc-symbol.png" alt="NTS" width={375} height={352} className="h-auto w-8" />
            <div className="leading-tight">
              <p className="font-display text-[15px] font-bold text-navy">
                Doc<span className="text-brand">Flow</span>
              </p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Validasi Dokumen Publik</p>
            </div>
          </div>
          <p className="hidden text-[12px] text-slate-400 sm:block">PT. SMKarier Inovasi Digital</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        {state === "loading" ? (
          <div className="flex h-[50vh] items-center justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : state === "notfound" || !data ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="mx-auto max-w-lg p-8 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-200 text-red-500">
                <ShieldX className="h-7 w-7" />
              </span>
              <h1 className="mt-4 font-display text-[20px] font-bold text-navy">Dokumen Tidak Ditemukan</h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-500">
                Token <span className="tnum font-semibold text-navy">{token}</span> tidak terdaftar pada arsip
                dokumen PT. SMKarier Inovasi Digital. Pastikan QR dipindai dari dokumen asli.
              </p>
              <p className="tnum mt-4 rounded-lg border border-dashed border-line bg-canvas/60 px-3.5 py-2.5 text-[12px] text-slate-400">
                Token valid berformat NTS-XXXX-XXXX-XXXX dan tidak berurutan.
              </p>
            </Card>
          </motion.div>
        ) : (
          <FoundView data={data} />
        )}
      </main>

      <footer className="border-t border-line bg-panel py-5">
        <p className="mx-auto max-w-5xl px-5 text-center text-[11.5px] leading-relaxed text-slate-400">
          Halaman validasi publik Nusadoc — hasil scan QR pada dokumen. Tanda tangan pada dokumen adalah
          specimen + QR verifikasi + hash SHA-256, <b>bukan</b> tanda tangan elektronik tersertifikasi PSrE.
        </p>
      </footer>
    </div>
  );
}

function FoundView({ data }: { data: ValidateResponse }) {
  const kind = data.kind!;
  // Field umum lintas jenis dokumen (number/date/issuedAt/token/hash).
  const doc = data.doc as unknown as {
    number: string; date: string; issuedAt: string; token: string; hash: string; clientId: string; snapshot?: unknown;
  };
  // Integritas: render dari snapshot saat terbit bila ada (bukan master terkini).
  const snap = partiesFromDoc({ snapshot: doc.snapshot as never, clientId: doc.clientId });
  const client = snap?.client ?? data.liveClient ?? undefined;
  const settings = snap?.settings ?? data.settings;
  const hashValid = Boolean((data.doc as { hashValid?: boolean } | null)?.hashValid);

  const number = doc.number;
  const date = doc.date;
  const amount = data.meta?.total ?? 0;
  const reference =
    data.quotationRef?.number ?? (data.invoiceRef ? data.invoiceRef.number : null);

  const quotationForSheet: Quotation | null =
    kind === "quotation"
      ? (doc as unknown as Quotation)
      : null;
  const invoiceForSheet: Invoice | null = kind === "invoice" ? (doc as unknown as Invoice) : null;
  const quotationRefForSheet: Quotation | undefined = data.quotationRef
    ? ({
        id: "", kind: "quotation", number: data.quotationRef.number, seq: 0, status: "approved",
        clientId: "", subject: data.quotationRef.subject, date: data.quotationRef.date,
        validUntil: "", items: [] as LineItem[],
        tax: { ppnEnabled: false, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 } as TaxConfig,
        token: "", hash: "", issuedAt: new Date().toISOString(),
      } as Quotation)
    : undefined;

  const invoiceTotal = useMemo(
    () => (invoiceForSheet ? computeTotals(invoiceForSheet.items, invoiceForSheet.tax).total : 0),
    [invoiceForSheet]
  );

  if (!settings) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center text-[13.5px] text-slate-500">
        Pengaturan perusahaan belum tersedia — hubungi administrator.
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-emerald-400/60 bg-emerald-50/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-emerald-400 text-emerald-600">
              <BadgeCheck className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-[16px] font-bold text-emerald-800">Dokumen Tervalidasi</p>
              <p className="text-[12px] text-emerald-700/70">Terdaftar pada arsip {settings.name}</p>
            </div>
          </div>
          <Badge tone="green" dot>
            {KIND_LABEL[kind].toUpperCase()} · ASLI
          </Badge>
        </div>

        <div className="grid gap-x-8 gap-y-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Jenis Dokumen" value={KIND_LABEL[kind]} />
          <Info label="Nomor" value={number} mono />
          <Info label="Tanggal Dokumen" value={formatDateLong(date)} />
          <Info label="Nilai" value={formatRupiah(amount)} mono strong />
          <Info label="Diterbitkan Oleh" value={settings.name} />
          <Info label="Untuk Klien" value={client?.name ?? "—"} />
          <Info label="Referensi Induk" value={reference ?? "—"} mono={!!reference} />
          <Info
            label="Integritas Hash"
            value={
              hashValid ? (
                <span className="text-emerald-700">SHA-256 cocok ✓</span>
              ) : (
                <span className="text-red-600">Hash tidak cocok ⚠</span>
              )
            }
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/50 px-6 py-3.5">
          <p className="tnum flex items-center gap-1.5 text-[11.5px] text-slate-400">
            <Hash className="h-3 w-3" /> Diterbitkan {formatDateShort(doc.issuedAt.slice(0, 10))} · token {doc.token}
          </p>
          <Button onClick={() => window.print()} className="no-print">
            <Printer className="h-4 w-4" /> Unduh PDF (A4)
          </Button>
        </div>
      </Card>

      <div className="print-area">
        <DocPreview>
          {kind === "quotation" && quotationForSheet && (
            <QuotationSheet quotation={quotationForSheet} client={client} settings={settings} />
          )}
          {kind === "invoice" && invoiceForSheet && (
            <InvoiceSheet
              invoice={invoiceForSheet}
              client={client}
              quotation={quotationRefForSheet}
              settings={settings}
              payments={data.payments ?? []}
            />
          )}
          {kind === "receipt" && data.invoiceRef && (
            <ReceiptSheet
              receipt={doc as unknown as Receipt}
              invoice={data.invoiceRef}
              client={client}
              settings={settings}
              paidTotal={(data.payments ?? []).reduce((s, p) => s + p.amount, 0) || undefined}
              invoiceTotal={invoiceTotal || undefined}
            />
          )}
        </DocPreview>
      </div>

      <p className="no-print text-center text-[12px] text-slate-400">
        Pratinjau dokumen asli · tombol <b>Unduh PDF</b> membuka dialog cetak dengan ukuran kertas A4
      </p>
    </motion.div>
  );
}

function Info({
  label,
  value,
  mono,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-1 break-all text-[13.5px] ${mono ? "tnum" : ""} ${strong ? "font-bold text-navy" : "font-semibold text-slate-700"}`}>
        {value}
      </p>
    </div>
  );
}
