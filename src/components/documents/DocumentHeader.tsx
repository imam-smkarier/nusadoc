"use client";

import Image from "next/image";
import type { CompanySettings } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Header dokumen — hemat tinta: tanpa blok latar brand.
 * Warna brand hanya garis tipis (2px) dan teks.
 */
export function DocumentHeader({
  settings,
  title,
  docLabel,
  number,
  dateLine,
  badge,
  className,
}: {
  settings: CompanySettings;
  title: string;
  docLabel: string;
  number: string;
  dateLine?: string;
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("avoid-break", className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-3">
          <Image
            src="/images/brand/nafiga-symbol.png"
            alt="Logo Nafiga"
            width={375}
            height={352}
            className="mt-0.5 h-auto w-[52px]"
          />
          <div>
            <h1 className="font-display text-[15px] font-bold leading-tight text-navy">{settings.name}</h1>
            <p className="mt-[1px] text-[8px] font-medium uppercase tracking-[0.14em] text-brand">{settings.tagline}</p>
            <p className="mt-1.5 text-[8.5px] leading-[1.55] text-slate-500">
              {settings.address}, {settings.city}
              <br />
              T {settings.phone} · {settings.email} · {settings.website}
              <br />
              NPWP {settings.npwp}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-400">{docLabel}</p>
          <h2 className="mt-0.5 font-display text-[26px] font-bold leading-none tracking-tight text-navy">{title}</h2>
          <p className="tnum mt-1.5 text-[9.5px] font-semibold text-slate-600">No. {number}</p>
          {dateLine && <p className="tnum mt-0.5 text-[8.5px] text-slate-500">{dateLine}</p>}
          {badge && <div className="mt-1.5">{badge}</div>}
        </div>
      </div>
      {/* garis brand: hanya tipis */}
      <div className="mt-3 border-b-2 border-brand" />
      <div className="mt-[2px] border-b border-line" />
    </header>
  );
}
