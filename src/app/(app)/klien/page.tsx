"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Button, Card, EmptyState } from "@/components/ui/primitives";
import { Field, TextInput } from "@/components/ui/form";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Modal";
import { useApp } from "@/lib/store";
import { useCan } from "@/lib/auth";
import type { Client } from "@/lib/types";

export default function KlienPage() {
  const { data } = useApp();
  const canClient = useCan("clients.write");
  const [query, setQuery] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const toast = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.clients;
    return data.clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.picName.toLowerCase().includes(q)
    );
  }, [data.clients, query]);

  return (
    <>
      <PageHeader
        title="Master Klien"
        desc="Sumber data tunggal — alamat, NPWP & PIC otomatis terbawa ke setiap dokumen."
        actions={
          canClient && (
            <Button onClick={() => setOpenNew(true)}>
              <Users className="h-4 w-4" /> Tambah Klien
            </Button>
          )
        }
      />

      <div className="p-5 lg:p-7">
        <Card className="overflow-hidden">
          <div className="border-b border-line p-4">
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, kota, atau PIC…"
              className="max-w-sm"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="Belum ada klien" desc="Tambahkan klien pertama untuk mulai membuat penawaran." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-line bg-canvas text-[11.5px] uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-semibold">Kode</th>
                    <th className="px-3 py-3 font-semibold">Nama Klien</th>
                    <th className="px-3 py-3 font-semibold">Kota</th>
                    <th className="px-3 py-3 font-semibold">PIC</th>
                    <th className="px-3 py-3 font-semibold">NPWP</th>
                    <th className="px-5 py-3 text-right font-semibold">Dokumen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((c) => {
                    const docs =
                      data.quotations.filter((q) => q.clientId === c.id).length +
                      data.invoices.filter((i) => i.clientId === c.id).length;
                    return (
                      <tr key={c.id} className="transition-colors hover:bg-canvas/50">
                        <td className="tnum px-5 py-3.5 text-[12px] font-semibold text-slate-400">{c.code}</td>
                        <td className="px-3 py-3.5">
                          <Link href={`/klien/${c.id}`} className="text-[13.5px] font-semibold text-navy hover:text-brand">
                            {c.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3.5 text-[13px] text-slate-600">{c.city}</td>
                        <td className="px-3 py-3.5 text-[13px] text-slate-600">
                          {c.picName}
                          <span className="tnum block text-[11.5px] text-slate-400">{c.picPhone}</span>
                        </td>
                        <td className="tnum px-3 py-3.5 text-[12.5px] text-slate-500">{c.npwp}</td>
                        <td className="tnum px-5 py-3.5 text-right text-[13px] font-semibold text-slate-600">{docs}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <NewClientModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        onCreated={(name) => {
          setOpenNew(false);
          toast({ tone: "success", title: "Klien tersimpan di master", desc: name });
        }}
      />
    </>
  );
}

function NewClientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (name: string) => void }) {
  const { addClient } = useApp();
  const [form, setForm] = useState<Omit<Client, "id" | "code" | "createdAt">>({
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
    <Modal open={open} onClose={onClose} title="Tambah Klien" desc="Masuk ke master klien dan bisa langsung dipakai di dokumen.">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nama Klien / Perusahaan" required className="col-span-2">
          <TextInput value={form.name} onChange={set("name")} placeholder="PT … / Dinas …" />
        </Field>
        <Field label="Alamat" required className="col-span-2">
          <TextInput value={form.address} onChange={set("address")} />
        </Field>
        <Field label="Kota">
          <TextInput value={form.city} onChange={set("city")} />
        </Field>
        <Field label="NPWP">
          <TextInput value={form.npwp} onChange={set("npwp")} />
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
      <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
        <Button variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button
          disabled={!valid}
          onClick={async () => {
            await addClient(form);
            onCreated(form.name);
            setForm({ name: "", address: "", city: "", npwp: "", picName: "", picPhone: "", picEmail: "" });
          }}
        >
          Simpan
        </Button>
      </div>
    </Modal>
  );
}
