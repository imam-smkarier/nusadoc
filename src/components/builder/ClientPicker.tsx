"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Plus, UserRound } from "lucide-react";
import { Combobox, Field, TextInput, TextArea } from "@/components/ui/form";
import { Button } from "@/components/ui/primitives";
import { useApp } from "@/lib/store";
import type { Client } from "@/lib/types";

/**
 * Pilih klien dari master: pilih satu → alamat/NPWP/PIC terisi otomatis (carry-over),
 * ada "+ Klien baru" inline tanpa keluar dari builder.
 */
export function ClientPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const { data, addClient } = useApp();
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState<Client | null>(null);

  const items = useMemo(
    () =>
      data.clients.map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: `${c.city} · U.p. ${c.picName}`,
        meta: c.code,
      })),
    [data.clients]
  );

  const selected = data.clients.find((c) => c.id === value) ?? null;

  if (creating) {
    return <InlineNewClient onCancel={() => setCreating(false)} onCreate={(c) => { setCreating(false); setJustCreated(c); onChange(c.id); }} />;
  }

  return (
    <div className="space-y-3">
      <Combobox
        items={items}
        value={value}
        onChange={onChange}
        placeholder="Cari klien di master…"
        emptyText="Klien tidak ditemukan"
        footer={(q) => (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-semibold text-brand hover:bg-brand-soft/60"
          >
            <Plus className="h-4 w-4" /> Klien baru — “{q}”
          </button>
        )}
      />

      {selected && (
        <div className="rounded-lg border border-line bg-canvas/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-[12.5px] leading-relaxed text-slate-600">
              <p className="flex items-center gap-1.5 font-semibold text-navy">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                {selected.name}
              </p>
              <p className="mt-1">
                {selected.address}, {selected.city} · NPWP <span className="tnum">{selected.npwp}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5 text-slate-400" /> {selected.picName} · {selected.picPhone} ·{" "}
                {selected.picEmail}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11.5px] text-slate-400">
            Alamat, NPWP & PIC terisi otomatis dari master klien — tidak perlu input ulang.
          </p>
        </div>
      )}
      {justCreated && !selected && null}
    </div>
  );
}

function InlineNewClient({ onCancel, onCreate }: { onCancel: () => void; onCreate: (c: Client) => void }) {
  const { addClient } = useApp();
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    npwp: "",
    picName: "",
    picPhone: "",
    picEmail: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim() !== "" && form.address.trim() !== "";

  return (
    <div className="rounded-lg border border-brand/30 bg-brand-soft/40 p-3.5">
      <p className="mb-3 text-[12.5px] font-semibold text-navy">Tambah Klien Baru ke Master</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nama Klien / Perusahaan" required className="col-span-2">
          <TextInput value={form.name} onChange={set("name")} placeholder="PT … / Dinas …" />
        </Field>
        <Field label="Alamat" required className="col-span-2">
          <TextArea value={form.address} onChange={set("address")} className="min-h-[56px]" />
        </Field>
        <Field label="Kota">
          <TextInput value={form.city} onChange={set("city")} />
        </Field>
        <Field label="NPWP">
          <TextInput value={form.npwp} onChange={set("npwp")} placeholder="00.000.000.0-000.000" />
        </Field>
        <Field label="Nama PIC">
          <TextInput value={form.picName} onChange={set("picName")} />
        </Field>
        <Field label="Telepon PIC">
          <TextInput value={form.picPhone} onChange={set("picPhone")} />
        </Field>
        <Field label="Email PIC" className="col-span-2">
          <TextInput value={form.picEmail} onChange={set("picEmail")} />
        </Field>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Batal
        </Button>
        <Button
          size="sm"
          disabled={!valid}
          onClick={async () => {
            const c = await addClient(form);
            onCreate(c);
          }}
        >
          Simpan & Pilih
        </Button>
      </div>
    </div>
  );
}
