"use client";

import type { CompanySettings } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Footer dokumen — mikro, abu-abu muda (hemat tinta). */
export function DocumentFooter({
  settings,
  note = "Dokumen divalidasi digital melalui QR. Tanda tangan = specimen + QR verifikasi + hash dokumen — bukan tanda tangan elektronik tersertifikasi (PSrE).",
  className,
}: {
  settings: CompanySettings;
  note?: string;
  className?: string;
}) {
  return (
    <footer className={cn("avoid-break mt-auto pt-4", className)}>
      <div className="border-t border-line pt-2 text-[6.8px] leading-[1.6] text-slate-400">
        <span className="font-semibold text-slate-500">{settings.name}</span> · {settings.address}, {settings.city} ·{" "}
        {settings.phone} · {settings.email}
        <br />
        {note}
      </div>
    </footer>
  );
}
