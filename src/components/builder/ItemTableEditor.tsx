"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, BookmarkPlus, Trash2 } from "lucide-react";
import { Field, PriceInput, TextInput } from "@/components/ui/form";
import { Button } from "@/components/ui/primitives";
import { useApp } from "@/lib/store";
import type { LineItem } from "@/lib/types";
import { formatRupiah, uid } from "@/lib/utils";

const emptyItem = (): LineItem => ({ id: uid("it"), name: "", description: "", qty: 1, unit: "paket", unitPrice: 0 });

/**
 * Tabel item editable: tambah / hapus / reorder + template item tersimpan.
 * Jumlah baris dihitung sistem — admin hanya mengisi qty & harga.
 */
export function ItemTableEditor({
  items,
  onChange,
  allowSaveTemplate = true,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  allowSaveTemplate?: boolean;
}) {
  const { data, saveTemplate, deleteTemplate } = useApp();
  const [tplName, setTplName] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);

  const patch = (id: string, p: Partial<LineItem>) => onChange(items.map((it) => (it.id === id ? { ...it, ...p } : it)));
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {data.templates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line bg-canvas/50 px-3 py-2.5">
          <span className="text-[12px] font-medium text-slate-500">Template item:</span>
          {data.templates.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1 rounded-full border border-line bg-white py-0.5 pl-2.5 pr-0.5">
              <button
                type="button"
                onClick={() => onChange([...items, ...t.items.map((it) => ({ ...it, id: uid("it") }))])}
                className="text-[12px] font-medium text-navy hover:text-brand"
              >
                {t.name}
              </button>
              <button
                type="button"
                title="Hapus template"
                onClick={() => deleteTemplate(t.id)}
                className="rounded-full p-1 text-slate-300 hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {items.map((it, i) => (
        <div key={it.id} className="rounded-lg border border-line bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="tnum rounded bg-canvas px-2 py-0.5 text-[11px] font-bold text-slate-500">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1.5 text-slate-400 hover:bg-canvas hover:text-navy disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded p-1.5 text-slate-400 hover:bg-canvas hover:text-navy disabled:opacity-30">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChange(items.filter((x) => x.id !== it.id))}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <TextInput
              value={it.name}
              onChange={(e) => patch(it.id, { name: e.target.value })}
              placeholder="Nama barang / jasa"
              className="font-medium"
            />
            <TextInput
              value={it.description ?? ""}
              onChange={(e) => patch(it.id, { description: e.target.value })}
              placeholder="Deskripsi singkat (opsional)"
              className="text-[12.5px]"
            />
            <div className="grid grid-cols-[70px_88px_1fr] gap-2">
              <Field label="Qty">
                <PriceInput value={it.qty} onChangeValue={(n) => patch(it.id, { qty: n })} className="text-left" />
              </Field>
              <Field label="Satuan">
                <TextInput value={it.unit} onChange={(e) => patch(it.id, { unit: e.target.value })} placeholder="paket" />
              </Field>
              <Field label="Harga Satuan (Rp)">
                <PriceInput value={it.unitPrice} onChangeValue={(n) => patch(it.id, { unitPrice: n })} />
              </Field>
            </div>
            <div className="flex items-center justify-between border-t border-dashed border-line pt-2">
              <span className="text-[11.5px] text-slate-400">Jumlah otomatis</span>
              <span className="tnum text-[13px] font-bold text-navy">{formatRupiah(Math.round(it.qty * it.unitPrice))}</span>
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, emptyItem()])}>
          + Tambah Baris
        </Button>

        {allowSaveTemplate && items.length > 0 && !savingTpl && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setSavingTpl(true)}>
            <BookmarkPlus className="h-3.5 w-3.5" /> Simpan sebagai template
          </Button>
        )}
        {savingTpl && (
          <span className="flex items-center gap-2">
            <TextInput
              autoFocus
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="Nama template"
              className="h-8 w-48 py-1"
            />
            <Button
              size="sm"
              disabled={!tplName.trim()}
              onClick={async () => {
                await saveTemplate(tplName.trim(), items);
                setTplName("");
                setSavingTpl(false);
              }}
            >
              Simpan
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSavingTpl(false)}>
              Batal
            </Button>
          </span>
        )}
      </div>
    </div>
  );
}
