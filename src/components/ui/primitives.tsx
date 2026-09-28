"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { InvoiceStatus, QuotationStatus } from "@/lib/types";

/* ── Button ── */

type ButtonVariant = "primary" | "navy" | "outline" | "ghost" | "danger" | "accent";
type ButtonSize = "sm" | "md" | "lg";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark shadow-sm",
  navy: "bg-navy text-white hover:bg-navy-600 shadow-sm",
  accent: "bg-accent text-white hover:bg-accent-dark shadow-sm",
  outline: "border border-line bg-white text-slate-700 hover:border-brand hover:text-brand shadow-sm",
  ghost: "text-slate-600 hover:bg-canvas hover:text-navy",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
};

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-45",
        BTN_VARIANT[variant],
        BTN_SIZE[size],
        className
      )}
      {...props}
    />
  );
}

/* ── Badge (outline — bukan fill) ── */

export type BadgeTone = "slate" | "blue" | "green" | "amber" | "red" | "orange";

const TONE: Record<BadgeTone, string> = {
  slate: "border-slate-300 text-slate-600",
  blue: "border-brand/40 text-brand",
  green: "border-emerald-300 text-emerald-700",
  amber: "border-amber-300 text-amber-700",
  red: "border-red-300 text-red-600",
  orange: "border-accent/50 text-accent-dark",
};

export function Badge({
  tone = "slate",
  className,
  dot,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-white/70 px-2.5 py-0.5 text-[11.5px] font-semibold",
        TONE[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const QUOTATION_BADGE: Record<QuotationStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "slate" },
  sent: { label: "Terkirim", tone: "blue" },
  approved: { label: "Disetujui", tone: "green" },
  rejected: { label: "Ditolak", tone: "red" },
  expired: { label: "Kedaluwarsa", tone: "amber" },
};

export const INVOICE_BADGE: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  sent: { label: "Terkirim", tone: "blue" },
  partial: { label: "Terbayar Sebagian", tone: "amber" },
  paid: { label: "Lunas", tone: "green" },
  overdue: { label: "Jatuh Tempo", tone: "red" },
};

/* ── Card ── */

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-line bg-panel shadow-card", className)}>{children}</div>;
}

export function CardHeader({ title, desc, action }: { title: React.ReactNode; desc?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h3 className="font-display text-[15px] font-semibold text-navy">{title}</h3>
        {desc && <p className="mt-0.5 text-[13px] text-slate-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── StatCard ── */

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "blue",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: BadgeTone;
}) {
  const toneMap: Record<string, string> = {
    blue: "text-brand bg-brand-soft",
    green: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    red: "text-red-500 bg-red-50",
    orange: "text-accent bg-accent-soft",
    slate: "text-slate-500 bg-canvas",
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-slate-500">{label}</span>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", toneMap[tone])}>{icon}</span>
      </div>
      <div className="tnum mt-3 font-display text-[26px] font-semibold leading-none text-navy">{value}</div>
      {sub && <div className="mt-2 text-[12.5px] text-slate-500">{sub}</div>}
    </Card>
  );
}

/* ── EmptyState ── */

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-canvas text-slate-400">
          {icon}
        </div>
      )}
      <div>
        <p className="font-medium text-navy">{title}</p>
        {desc && <p className="mt-1 max-w-sm text-[13px] text-slate-500">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Toggle (switch) ── */

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-white px-3.5 py-3 text-left transition-colors hover:border-brand/50"
    >
      <span>
        <span className="block text-sm font-medium text-navy">{label}</span>
        {hint && <span className="mt-0.5 block text-[12px] text-slate-500">{hint}</span>}
      </span>
      <span
        className={cn(
          "relative h-5.5 w-10 shrink-0 rounded-full border transition-colors",
          checked ? "border-brand bg-brand" : "border-line bg-canvas"
        )}
        style={{ height: 22, width: 40 }}
      >
        <span
          className={cn(
            "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-[3px]"
          )}
        />
      </span>
    </button>
  );
}

/* ── Spinner ── */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent", className)}
      role="status"
      aria-label="Memuat"
    />
  );
}
