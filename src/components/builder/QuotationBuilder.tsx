"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Field, DateInput, TextArea } from "@/components/ui/form";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Modal";
import { BuilderShell } from "./BuilderShell";
import { ClientPicker } from "./ClientPicker";
import { ItemTableEditor } from "./ItemTableEditor";
import { SectionCard } from "./SectionCard";
import { TaxToggles } from "./TaxToggles";
import { useDocDraft } from "./useDocDraft";
import { DocPreview } from "@/components/documents/DocumentSheet";
import { QuotationSheet } from "@/components/documents/QuotationSheet";
import { computeTotals } from "@/lib/calc";
import { useApp } from "@/lib/store";
import type { LineItem, Quotation, TaxConfig } from "@/lib/types";
import { addDaysISO, todayISO, uid } from "@/lib/utils";

interface QuoDraft {
  clientId: string | null;
  subject: string;
  date: string;
  validUntil: string;
  items: LineItem[];
  tax: TaxConfig;
  notes: string;
}

function initialDraft(ppnDefault: boolean, notes: string, clientId: string | null): QuoDraft {
  return {
    clientId,
    subject: "",
    date: todayISO(),
    validUntil: addDaysISO(todayISO(), 30),
    items: [{ id: uid("it"), name: "", description: "", qty: 1, unit: "paket", unitPrice: 0 }],
    tax: { ppnEnabled: ppnDefault, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    notes,
  };
}

export function QuotationBuilder() {
  const router = useRouter();
  const params = useSearchParams();
  const { data, issueQuotation } = useApp();
  const toast = useToast();
  const [publishing, setPublishing] = useState(false);

  const preselect = params.get("client");
  const { doc, setDoc, savedAt, restored, clear } = useDocDraft<QuoDraft>(
    "docflow:draft:quotation",
    initialDraft(data.settings.ppnDefault, data.settings.defaultNotesQuotation, preselect)
  );
  // Draft lama tidak boleh menimpa konteks URL (?client=…) — buang bila klien berbeda.
  useEffect(() => {
    if (restored && preselect && doc.clientId !== preselect) clear();
  }, [restored, preselect, doc.clientId, clear]);

  const totals = useMemo(() => computeTotals(doc.items, doc.tax), [doc.items, doc.tax]);
  const client = data.clients.find((c) => c.id === doc.clientId);

  const draftQuotation: Quotation = useMemo(
    () => ({
      id: "draft",
      kind: "quotation",
      number: "NTS/QUO/…/—",
      seq: 0,
      status: "draft",
      clientId: doc.clientId ?? "",
      subject: doc.subject,
      date: doc.date,
      validUntil: doc.validUntil,
      items: doc.items,
      tax: doc.tax,
      notes: doc.notes,
      token: "NTS-DRAFT",
      hash: "—",
      issuedAt: new Date().toISOString(),
    }),
    [doc]
  );

  const valid = !!doc.clientId && doc.subject.trim() !== "" && doc.items.some((it) => it.name.trim() !== "" && it.unitPrice > 0);

  const publish = async () => {
    if (!valid) return;
    setPublishing(true);
    try {
      const q = await issueQuotation({
        clientId: doc.clientId!,
        subject: doc.subject.trim(),
        date: doc.date,
        validUntil: doc.validUntil,
        items: doc.items,
        tax: doc.tax,
        notes: doc.notes || undefined,
      });
      clear();
      toast({ tone: "success", title: "Penawaran diterbitkan", desc: `${q.number} · siap dikirim ke klien` });
      router.push(`/penawaran/${q.id}`);
    } catch (e) {
      toast({ tone: "error", title: "Penerbitan gagal", desc: e instanceof Error ? e.message : "Coba lagi" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <BuilderShell
      title="Buat Penawaran"
      subtitle={`Nomor otomatis: NTS/QUO/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}/… — diterbitkan saat final`}
      savedAt={restored ? savedAt : null}
      onDiscard={restored && savedAt ? clear : undefined}
      onCancel={() => router.push("/penawaran")}
      publishDisabled={!valid}
      publishLabel="Terbitkan Penawaran"
      onPublish={publish}
      publishing={publishing}
      preview={
        <DocPreview>
          <QuotationSheet quotation={draftQuotation} client={client} settings={data.settings} mode="preview" />
        </DocPreview>
      }
    >
      <SectionCard step={1} title="Klien" summary={client?.name ?? "Belum dipilih"}>
        <ClientPicker value={doc.clientId} onChange={(id) => setDoc((d) => ({ ...d, clientId: id }))} />
      </SectionCard>

      <SectionCard step={2} title="Detail Dokumen" summary={doc.subject || "Perihal belum diisi"}>
        <div className="space-y-3">
          <Field label="Perihal / Judul Penawaran" required>
            <TextArea
              value={doc.subject}
              onChange={(e) => setDoc((d) => ({ ...d, subject: e.target.value }))}
              placeholder="Mis. Implementasi SIMAK Aset Digital — Sistem Manajemen Aset Terintegrasi"
              className="min-h-[64px]"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal Dokumen">
              <DateInput value={doc.date} onChange={(e) => setDoc((d) => ({ ...d, date: e.target.value }))} />
            </Field>
            <Field label="Berlaku Sampai Dengan">
              <DateInput value={doc.validUntil} onChange={(e) => setDoc((d) => ({ ...d, validUntil: e.target.value }))} />
            </Field>
          </div>
          <Field label="Syarat & Ketentuan" hint="Ditampilkan di badan penawaran di bawah tabel item.">
            <TextArea
              value={doc.notes}
              onChange={(e) => setDoc((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Masa berlaku harga, termin, garansi…"
              className="min-h-[72px]"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        step={3}
        title="Rincian Item"
        summary={`${doc.items.length} baris · subtotal ${totals.subtotal.toLocaleString("id-ID")}`}
      >
        <ItemTableEditor items={doc.items} onChange={(items) => setDoc((d) => ({ ...d, items }))} />
      </SectionCard>

      <SectionCard step={4} title="Pajak & Termin" summary={`Total ${totals.total.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}`}>
        <TaxToggles tax={doc.tax} onChange={(tax) => setDoc((d) => ({ ...d, tax }))} totals={totals} />
      </SectionCard>

      {!valid && (
        <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[12.5px] text-amber-800">
          Lengkapi: <b>klien</b>, <b>perihal</b>, dan minimal <b>satu item bernilai</b> sebelum menerbitkan.
        </p>
      )}
      <p className="px-1 text-[11.5px] leading-relaxed text-slate-400">
        Terbit = final: nomor, token validasi & hash SHA-256 dikunci. Penawaran draft tersimpan otomatis di browser
        ini (localStorage), bukan di server.
      </p>
      <div className="pb-6">
        <Button className="w-full" size="lg" onClick={publish} disabled={!valid || publishing}>
          Terbitkan Penawaran
        </Button>
      </div>
    </BuilderShell>
  );
}
