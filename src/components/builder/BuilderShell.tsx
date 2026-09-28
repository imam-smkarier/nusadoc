"use client";

import { BookOpen, Check, CloudUpload, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { cn, formatTime } from "@/lib/utils";

/**
 * Kerangka builder: split screen — kiri form (scroll), kanan preview A4 live.
 * Bar atas: status autosave draft + aksi utama.
 */
export function BuilderShell({
  title,
  subtitle,
  savedAt,
  onDiscard,
  discardLabel = "Buang Draft",
  onCancel,
  publishDisabled,
  publishLabel,
  onPublish,
  publishing,
  children,
  preview,
}: {
  title: string;
  subtitle?: string;
  savedAt: number | null;
  onDiscard?: () => void;
  discardLabel?: string;
  onCancel: () => void;
  publishDisabled?: boolean;
  publishLabel: string;
  onPublish: () => void;
  publishing?: boolean;
  children: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col">
      {/* Bar builder */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-panel px-5 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[16px] font-bold text-navy">{title}</h1>
          {subtitle && <p className="truncate text-[12.5px] text-slate-500">{subtitle}</p>}
        </div>

        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium sm:inline-flex",
            savedAt ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-line bg-canvas text-slate-400"
          )}
        >
          {savedAt ? <Check className="h-3.5 w-3.5" /> : <CloudUpload className="h-3.5 w-3.5" />}
          {savedAt ? `Draft tersimpan ${formatTime(new Date(savedAt))}` : "Autosave aktif"}
        </span>

        {onDiscard && (
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            <Trash2 className="h-3.5 w-3.5" /> {discardLabel}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onCancel}>
          <X className="h-3.5 w-3.5" /> Batal
        </Button>
        <Button size="sm" onClick={onPublish} disabled={publishDisabled || publishing}>
          {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
          {publishLabel}
        </Button>
      </div>

      {/* Split: form kiri · preview kanan */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="thin-scroll w-full overflow-y-auto border-b border-line bg-canvas p-4 lg:w-[47%] lg:border-b-0 lg:border-r lg:p-5">
          <div className="mx-auto max-w-[560px] space-y-3.5">{children}</div>
        </div>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-[#e8edf2] p-5">
          <div className="mx-auto max-w-[860px]">
            <p className="mb-2.5 text-center text-[11.5px] font-medium uppercase tracking-[0.14em] text-slate-400">
              Live Preview A4 — berubah saat diketik
            </p>
            {preview}
          </div>
        </div>
      </div>
    </div>
  );
}
