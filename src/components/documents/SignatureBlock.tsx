"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { CompanySettings } from "@/lib/types";
import { cn, formatDateLong, formatDateShort } from "@/lib/utils";
import { validationUrl } from "@/lib/token";

/**
 * Blok tanda tangan: specimen tanda tangan + QR verifikasi + hash dokumen.
 * CATATAN (sengaja tercantum di footer): ini BUKAN tanda tangan elektronik
 * tersertifikasi PSrE — visual & verifiable link saja.
 */
export function SignatureBlock({
  settings,
  dateISO,
  counterLabel,
  token,
  hash,
  qrValue: qrValueProp,
  className,
}: {
  settings: CompanySettings;
  dateISO: string;
  /** label pihak counter (mis. "Menyetujui,") — kosongkan jika hanya NTS */
  counterLabel?: string;
  token: string;
  hash: string;
  qrValue?: string;
  className?: string;
}) {
  // URL validasi HANYA dihitung di client (window.location). State diawali kosong
  // — baik di SSR maupun paint pertama — agar tidak terjadi hydration mismatch;
  // prop qrValue (jika diisi pemanggil) tetap dihormati setelah mount.
  const [qrValue, setQrValue] = useState("");
  useEffect(() => {
    setQrValue(qrValueProp ?? validationUrl(token));
  }, [qrValueProp, token]);
  return (
    <section className={cn("avoid-break mt-7 flex items-end justify-between gap-8", className)}>
      {counterLabel ? (
        <div className="text-center">
          <p className="text-[9px] text-slate-600">{counterLabel}</p>
          <div className="mt-14 w-[170px] border-t border-slate-500 pt-1 text-[8px] text-slate-400">
            Nama & jabatan jelas
          </div>
        </div>
      ) : (
        <div className="max-w-[300px] text-[7.5px] leading-[1.7] text-slate-400">
          Dokumen ini diterbitkan elektronik oleh Nafiga DocFlow. Keabsahan dapat diperiksa dengan memindai QR
          atau membuka tautan validasi yang tercetak di samping.
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="text-center">
          <p className="tnum text-[9px] text-slate-600">
            {settings.signCity}, {formatDateLong(dateISO)}
          </p>
          <p className="mt-0.5 text-[8px] text-slate-500">Hormat kami,</p>
          <p className="doc-specimen mt-7 text-[19px] leading-none text-navy-700">{settings.signName}</p>
          <div className="mx-auto mt-1.5 w-[170px] border-t border-slate-500 pt-1">
            <p className="text-[9px] font-bold text-slate-800">{settings.signName}</p>
            <p className="text-[8px] text-slate-500">{settings.signTitle}</p>
          </div>
        </div>

        <div className="w-[118px] rounded border border-line p-2 text-center">
          <QRCodeSVG value={qrValue} size={86} level="M" marginSize={0} />
          <p className="tnum mt-1.5 text-[6.5px] font-semibold leading-tight text-slate-500">
            Pindai untuk validasi
            <br />
            <span className="break-all text-slate-400">{qrValue.replace(/^https?:\/\//, "")}</span>
          </p>
          <p className="tnum mt-1 border-t border-line pt-1 text-[6px] leading-tight text-slate-400">
            SHA-256
            <br />
            <span className="break-all">{hash.slice(0, 40)}…</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/** Helper kecil untuk label tanggal pendek di meta (dipakai sheet lain). */
export { formatDateShort };
