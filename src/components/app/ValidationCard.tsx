"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, QrCode } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/primitives";
import { validationUrl } from "@/lib/token";

/** Kartu tautan validasi publik (/v/<token>) — dipakai rail detail dokumen. */
export function ValidationCard({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = validationUrl(token);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard tidak tersedia */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Card>
      <CardHeader title="Validasi Publik" desc="Klien dapat memeriksa keaslian lewat QR / tautan ini — tanpa login." />
      <div className="p-5">
        <div className="flex items-center gap-2.5 rounded-lg border border-line bg-canvas/60 px-3 py-2.5">
          <QrCode className="h-4 w-4 shrink-0 text-brand" />
          <span className="tnum min-w-0 flex-1 truncate text-[12.5px] font-semibold text-navy">{url}</span>
          <button onClick={copy} title="Salin tautan" className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-brand">
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </button>
          <a href={url} target="_blank" rel="noreferrer" title="Buka halaman validasi" className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-brand">
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <p className="tnum mt-2 text-[11.5px] text-slate-400">
          Token acak {token} — tidak bisa ditebak dari nomor urut dokumen.
        </p>
      </div>
    </Card>
  );
}
