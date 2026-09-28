"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn, formatNumber, parseNumberInput } from "@/lib/utils";

/* ── Field wrapper ── */

export function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline gap-1 text-[12.5px] font-medium text-slate-600">
        {label}
        {required && <span className="text-accent">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] leading-snug text-slate-400">{hint}</span>}
    </label>
  );
}

const INPUT_BASE =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:bg-canvas disabled:text-slate-400";

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(INPUT_BASE, className)} {...props} />;
}

export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(INPUT_BASE, "min-h-[84px] resize-y leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(INPUT_BASE, "appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export function DateInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="date" className={cn(INPUT_BASE, "tnum", className)} {...props} />;
}

/* ── PriceInput — harga auto format ribuan (1000000 → 1.000.000) ── */

export function PriceInput({
  value,
  onChangeValue,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: number;
  onChangeValue: (n: number) => void;
}) {
  return (
    <input
      inputMode="numeric"
      value={value ? formatNumber(value) : ""}
      onChange={(e) => onChangeValue(parseNumberInput(e.target.value))}
      className={cn(INPUT_BASE, "tnum text-right", className)}
      placeholder="0"
      {...props}
    />
  );
}

/* ── Combobox — cari & pilih dari daftar ── */

export interface ComboItem {
  id: string;
  label: string;
  sublabel?: string;
  meta?: string;
}

export function Combobox({
  items,
  value,
  onChange,
  placeholder = "Cari…",
  emptyText = "Tidak ada hasil",
  footer,
  className,
}: {
  items: ComboItem[];
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
  footer?: (query: string) => React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) => it.label.toLowerCase().includes(q) || it.sublabel?.toLowerCase().includes(q) || it.meta?.toLowerCase().includes(q)
    );
  }, [items, query]);

  const selected = items.find((it) => it.id === value) ?? null;

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      {open ? (
        <div className="overflow-visible">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id={inputId}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && filtered[0]) {
                  onChange(filtered[0].id);
                  setOpen(false);
                }
              }}
              placeholder={placeholder}
              className={cn(INPUT_BASE, "pl-9")}
            />
          </div>
          <div className="thin-scroll absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-lg border border-line bg-white shadow-pop">
            {filtered.length === 0 && <p className="px-3.5 py-3 text-[13px] text-slate-400">{emptyText}</p>}
            {filtered.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => {
                  onChange(it.id);
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-brand-soft/60",
                  it.id === value && "bg-brand-soft/70"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-navy">{it.label}</span>
                  {it.sublabel && <span className="block truncate text-[12px] text-slate-500">{it.sublabel}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {it.meta && <span className="tnum text-[12px] text-slate-400">{it.meta}</span>}
                  {it.id === value && <Check className="h-4 w-4 text-brand" />}
                </span>
              </button>
            ))}
            {footer && query.trim() !== "" && <div className="border-t border-line">{footer(query)}</div>}
            {footer && query.trim() === "" && items.length === 0 && <div className="border-t border-line">{footer("")}</div>}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(INPUT_BASE, "flex items-center justify-between text-left")}
        >
          <span className={cn("truncate", !selected && "text-slate-400")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      )}
    </div>
  );
}
