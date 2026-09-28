"use client";

import { useEffect, useState } from "react";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/AppShell";
import { Button, Card, CardHeader, Toggle } from "@/components/ui/primitives";
import { Field, TextInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/Modal";
import { useApp } from "@/lib/store";
import { useCan } from "@/lib/auth";
import { uid } from "@/lib/utils";
import type { CompanySettings } from "@/lib/types";

export default function PengaturanPage() {
  const { data, updateSettings, resetDemoData } = useApp();
  const canSettings = useCan("settings.update");
  const isAdmin = useCan("*");
  const toast = useToast();
  const [form, setForm] = useState<CompanySettings>(data.settings);

  // sinkron bila data direload dari localStorage
  useEffect(() => setForm(data.settings), [data.settings]);

  const set = <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    updateSettings(form);
    toast({ tone: "success", title: "Pengaturan tersimpan", desc: "Dipakai dokumen berikutnya." });
  };

  return (
    <>
      <PageHeader
        title="Pengaturan"
        desc="Profil perusahaan, rekening pembayaran, specimen tanda tangan & preferensi dokumen."
        actions={
          <>
            {isAdmin && (
            <Button
              variant="danger"
              onClick={() => {
                resetDemoData();
                toast({ tone: "info", title: "Data demo direset", desc: "Semua perubahan mockup dikembalikan ke data awal." });
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reset Data Demo
            </Button>
            )}
            {canSettings && (
            <Button onClick={save}>
              <Save className="h-4 w-4" /> Simpan
            </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 p-5 xl:grid-cols-2 lg:p-7">
        <Card>
          <CardHeader title="Profil Perusahaan" desc="Tercetak di header setiap dokumen." />
          <div className="grid grid-cols-2 gap-4 p-5">
            <Field label="Nama Perusahaan" className="col-span-2">
              <TextInput value={form.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Tagline" className="col-span-2">
              <TextInput value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
            </Field>
            <Field label="Alamat" className="col-span-2">
              <TextInput value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Kota">
              <TextInput value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="NPWP">
              <TextInput value={form.npwp} onChange={(e) => set("npwp", e.target.value)} />
            </Field>
            <Field label="Telepon">
              <TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <TextInput value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Website" className="col-span-2">
              <TextInput value={form.website} onChange={(e) => set("website", e.target.value)} />
            </Field>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Rekening Pembayaran" desc="Tampil di badan invoice." />
            <div className="space-y-3 p-5">
              {form.banks.map((b) => (
                <div key={b.id} className="grid grid-cols-[1fr_1.2fr_1fr_auto] items-end gap-2">
                  <Field label="Bank">
                    <TextInput
                      value={b.bank}
                      onChange={(e) =>
                        set("banks", form.banks.map((x) => (x.id === b.id ? { ...x, bank: e.target.value } : x)))
                      }
                    />
                  </Field>
                  <Field label="Nomor">
                    <TextInput
                      value={b.number}
                      onChange={(e) =>
                        set("banks", form.banks.map((x) => (x.id === b.id ? { ...x, number: e.target.value } : x)))
                      }
                    />
                  </Field>
                  <Field label="a.n.">
                    <TextInput
                      value={b.holder}
                      onChange={(e) =>
                        set("banks", form.banks.map((x) => (x.id === b.id ? { ...x, holder: e.target.value } : x)))
                      }
                    />
                  </Field>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-0.5"
                    onClick={() => set("banks", form.banks.filter((x) => x.id !== b.id))}
                  >
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => set("banks", [...form.banks, { id: uid("bank"), bank: "", number: "", holder: form.name }])}
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Rekening
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Specimen Tanda Tangan" desc="Dicetak di blok tanda tangan + QR verifikasi." />
            <div className="grid grid-cols-3 gap-4 p-5">
              <Field label="Nama Pejabat">
                <TextInput value={form.signName} onChange={(e) => set("signName", e.target.value)} />
              </Field>
              <Field label="Jabatan">
                <TextInput value={form.signTitle} onChange={(e) => set("signTitle", e.target.value)} />
              </Field>
              <Field label="Kota TTD">
                <TextInput value={form.signCity} onChange={(e) => set("signCity", e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Preferensi Dokumen" desc="Nilai bawaan saat membuat dokumen baru." />
          <div className="space-y-4 p-5">
            <Toggle
              checked={form.ppnDefault}
              onChange={(v) => set("ppnDefault", v)}
              label="PPN 11% aktif secara bawaan"
              hint="Dokumen baru langsung menghitung PPN — bisa dimatikan per dokumen."
            />
            <Field label="Catatan bawaan — Penawaran">
              <TextInput value={form.defaultNotesQuotation} onChange={(e) => set("defaultNotesQuotation", e.target.value)} />
            </Field>
            <Field label="Catatan bawaan — Invoice">
              <TextInput value={form.defaultNotesInvoice} onChange={(e) => set("defaultNotesInvoice", e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-[15px] font-semibold text-navy">Tentang Validasi Dokumen</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
            Setiap dokumen terbit mendapat <span className="font-semibold text-navy">token acak</span> (tidak bisa
            ditebak dari nomor urut) yang menjadi URL halaman validasi publik{" "}
            <span className="tnum font-semibold text-brand">/v/&lt;token&gt;</span>. QR di dokumen mengarah ke URL
            tersebut, disertai <span className="font-semibold text-navy">hash SHA-256</span> isi dokumen.
          </p>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-amber-800">
            <span className="font-semibold">Catatan:</span> “tanda tangan digital” pada mockup ini = specimen tanda
            tangan + QR verifikasi + hash dokumen (visual & verifiable link) — <b>bukan</b> tanda tangan elektronik
            tersertifikasi PSrE. Kekuatan hukum penuh memerlukan integrasi terpisah (Privy/Peruri).
          </p>
        </Card>
      </div>
    </>
  );
}
