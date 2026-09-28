"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2, Layers } from "lucide-react";
import { DateInput, Field, Select, TextArea, TextInput } from "@/components/ui/form";
import { Button, Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Modal";
import { BuilderShell } from "./BuilderShell";
import { ClientPicker } from "./ClientPicker";
import { ItemTableEditor } from "./ItemTableEditor";
import { SectionCard } from "./SectionCard";
import { TaxToggles } from "./TaxToggles";
import { useDocDraft } from "./useDocDraft";
import { DocPreview } from "@/components/documents/DocumentSheet";
import { InvoiceSheet } from "@/components/documents/InvoiceSheet";
import { computeTotals, scaleItems, TERMIN_PRESETS } from "@/lib/calc";
import { useApp } from "@/lib/store";
import type { Invoice, LineItem, Quotation, TaxConfig } from "@/lib/types";
import { addDaysISO, cn, formatRupiah, todayISO, uid } from "@/lib/utils";

interface InvDraft {
  mode: "direct" | "from-quotation";
  quotationId: string | null;
  clientId: string | null;
  subject: string;
  date: string;
  dueDate: string;
  terminKey: string; // preset key atau "custom"
  terminPct: number;
  terminCustomLabel: string;
  items: LineItem[]; // dipakai mode direct
  tax: TaxConfig;
  notes: string;
}

function initialDraft(ppnDefault: boolean, notes: string, from: string | null): InvDraft {
  return {
    mode: from ? "from-quotation" : "direct",
    quotationId: from,
    clientId: null,
    subject: "",
    date: todayISO(),
    dueDate: addDaysISO(todayISO(), 14),
    terminKey: "dp50",
    terminPct: 50,
    terminCustomLabel: "",
    items: from ? [] : [{ id: uid("it"), name: "", description: "", qty: 1, unit: "paket", unitPrice: 0 }],
    tax: { ppnEnabled: ppnDefault, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    notes,
  };
}

export function InvoiceBuilder() {
  const router = useRouter();
  const params = useSearchParams();
  const { data, issueInvoice } = useApp();
  const toast = useToast();
  const [publishing, setPublishing] = useState(false);

  const fromParam = params.get("from");
  const { doc, setDoc, savedAt, restored, clear } = useDocDraft<InvDraft>(
    "docflow:draft:invoice",
    initialDraft(data.settings.ppnDefault, data.settings.defaultNotesInvoice, fromParam)
  );
  // Draft lama tidak boleh menimpa konteks (?from=…) — buang bila induk berbeda/mode salah.
  useEffect(() => {
    if (restored && fromParam && doc.quotationId !== fromParam) clear();
    if (restored && fromParam && doc.mode !== "from-quotation") clear();
  }, [restored, fromParam, doc.quotationId, doc.mode, clear]);

  /* Penawaran induk yang memenuhi syarat: Disetujui */
  const eligibleQuotations = useMemo(
    () => data.quotations.filter((q) => q.status === "approved"),
    [data.quotations]
  );
  const parent = doc.quotationId ? data.quotations.find((q) => q.id === doc.quotationId) : undefined;

  /* Carry-over: item invoice = item penawaran diskalakan persentase termin */
  const carryItems: LineItem[] = useMemo(() => {
    if (doc.mode !== "from-quotation" || !parent) return [];
    return scaleItems(parent.items, doc.terminPct);
  }, [doc.mode, parent, doc.terminPct]);

  const items = doc.mode === "from-quotation" ? carryItems : doc.items;
  const clientId = doc.mode === "from-quotation" ? (parent?.clientId ?? null) : doc.clientId;
  const client = data.clients.find((c) => c.id === clientId);
  const totals = useMemo(() => computeTotals(items, doc.tax), [items, doc.tax]);

  const terminLabel =
    doc.mode === "from-quotation"
      ? doc.terminKey === "custom"
        ? doc.terminCustomLabel || "Termin Khusus"
        : TERMIN_PRESETS.find((p) => p.key === doc.terminKey)?.label ?? "Termin"
      : undefined;

  const draftInvoice: Invoice = useMemo(
    () => ({
      id: "draft",
      kind: "invoice",
      number: doc.mode === "from-quotation" && parent ? `NTS/INV/…/${String(parent.seq).padStart(3, "0")}-T?` : "NTS/INV/…/—",
      seq: 0,
      terminIndex: doc.mode === "from-quotation" ? 1 : undefined,
      terminLabel,
      terminPct: doc.mode === "from-quotation" ? doc.terminPct : undefined,
      quotationId: doc.mode === "from-quotation" ? parent?.id : undefined,
      clientId: clientId ?? "",
      subject: doc.subject,
      date: doc.date,
      dueDate: doc.dueDate,
      items,
      tax: doc.tax,
      notes: doc.notes,
      token: "NTS-DRAFT",
      hash: "—",
      issuedAt: new Date().toISOString(),
    }),
    [doc, parent, clientId, items, terminLabel]
  );

  const valid =
    !!clientId &&
    doc.subject.trim() !== "" &&
    items.some((it) => it.name.trim() !== "" && it.unitPrice > 0) &&
    (doc.mode === "direct" || !!parent);

  const publish = async () => {
    if (!valid) return;
    setPublishing(true);
    try {
      const inv = await issueInvoice({
        clientId: clientId!,
        subject: doc.subject.trim(),
        date: doc.date,
        dueDate: doc.dueDate,
        items,
        tax: doc.tax,
        notes: doc.notes || undefined,
        quotationId: doc.mode === "from-quotation" ? parent?.id : undefined,
        terminLabel: doc.mode === "from-quotation" ? terminLabel : undefined,
        terminPct: doc.mode === "from-quotation" ? doc.terminPct : undefined,
      });
      clear();
      toast({ tone: "success", title: "Invoice diterbitkan", desc: inv.number });
      router.push(`/invoice/${inv.id}`);
    } catch (e) {
      toast({ tone: "error", title: "Penerbitan gagal", desc: e instanceof Error ? e.message : "Coba lagi" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <BuilderShell
      title="Buat Invoice"
      subtitle={
        doc.mode === "from-quotation" && parent
          ? `Carry-over dari ${parent.number} — data klien & item tidak diinput ulang`
          : "Repeat order — tanpa penawaran"
      }
      savedAt={restored ? savedAt : null}
      onDiscard={restored && savedAt ? clear : undefined}
      onCancel={() => router.push("/invoice")}
      publishDisabled={!valid}
      publishLabel="Terbitkan Invoice"
      onPublish={publish}
      publishing={publishing}
      preview={
        <DocPreview>
          <InvoiceSheet
            invoice={draftInvoice}
            client={client}
            quotation={doc.mode === "from-quotation" ? parent : undefined}
            settings={data.settings}
            mode="preview"
          />
        </DocPreview>
      }
    >
      {/* Pilihan sumber */}
      {!fromParam && (
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { key: "from-quotation", icon: Link2, title: "Dari Penawaran", desc: "Pilih penawaran Disetujui, data terbawa otomatis" },
              { key: "direct", icon: Layers, title: "Langsung / Repeat Order", desc: "Tanpa penawaran — input manual" },
            ] as const
          ).map(({ key, icon: Icon, title, desc }) => (
            <button
              key={key}
              type="button"
              onClick={() => setDoc((d) => ({ ...d, mode: key, quotationId: key === "from-quotation" ? d.quotationId : null }))}
              className={cn(
                "rounded-xl border p-3.5 text-left transition-colors",
                doc.mode === key ? "border-brand bg-brand-soft/50" : "border-line bg-white hover:border-slate-300"
              )}
            >
              <Icon className={cn("h-5 w-5", doc.mode === key ? "text-brand" : "text-slate-400")} />
              <p className="mt-2 text-[13px] font-semibold text-navy">{title}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{desc}</p>
            </button>
          ))}
        </div>
      )}

      {doc.mode === "from-quotation" ? (
        /* ── MODE DARI PENAWARAN ── */
        <>
          <SectionCard step={1} title="Penawaran Induk" summary={parent?.number ?? "Pilih penawaran Disetujui"}>
            <div className="space-y-2">
              {eligibleQuotations.length === 0 && (
                <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3.5 py-3 text-[12.5px] text-amber-800">
                  Belum ada penawaran berstatus <b>Disetujui</b>. Setujui penawaran dulu untuk membuat invoice dari
                  penawaran — atau pakai mode Langsung.
                </p>
              )}
              {eligibleQuotations.map((q) => {
                const quoClient = data.clients.find((c) => c.id === q.clientId);
                const total = computeTotals(q.items, q.tax).total;
                const issued = data.invoices.filter((i) => i.quotationId === q.id);
                const issuedPct = issued.reduce((s, i) => s + (i.terminPct ?? 0), 0);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() =>
                      setDoc((d) => ({
                        ...d,
                        quotationId: q.id,
                        subject: d.subject || `Termin — ${q.subject}`,
                        // pajak diwarisi penawaran induk (carry-over penuh)
                        tax: q.tax,
                      }))
                    }
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      doc.quotationId === q.id ? "border-brand bg-brand-soft/50" : "border-line bg-white hover:border-slate-300"
                    )}
                  >
                    <span className="tnum block text-[12px] font-bold text-brand">{q.number}</span>
                    <span className="block text-[13px] font-semibold text-navy">{quoClient?.name}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-slate-500">{q.subject}</span>
                    <span className="tnum mt-1 block text-[12px] text-slate-500">
                      {formatRupiah(total)} · sudah diterbitkan {issuedPct}% ({issued.length} invoice)
                    </span>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard step={2} title="Termin" summary={`${terminLabel ?? "—"} · ${doc.terminPct}%`}>
            <div className="space-y-3">
              {(() => {
                const usedPct = doc.quotationId
                  ? data.invoices.filter((i) => i.quotationId === doc.quotationId).reduce((s2, i) => s2 + (i.terminPct ?? 0), 0)
                  : 0;
                const remaining = Math.max(0, 100 - usedPct);
                return remaining > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDoc((d) => ({
                        ...d,
                        terminKey: "custom",
                        terminPct: remaining,
                        terminCustomLabel: remaining === 100 ? "Pelunasan 100%" : `Pelunasan sisa ${remaining}%`,
                      }))
                    }
                    className="w-full rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-left text-[12.5px] font-semibold text-accent-dark transition-colors hover:border-accent"
                  >
                    Sisa pelunasan ({remaining}%)
                    <span className="tnum block text-[11px] font-normal text-slate-500">
                      100% − {usedPct}% yang sudah diterbitkan — direkomendasikan
                    </span>
                  </button>
                ) : null;
              })()}
              <div className="grid grid-cols-2 gap-2">
                {TERMIN_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setDoc((d) => ({ ...d, terminKey: p.key, terminPct: p.pct }))}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-[12.5px] font-medium transition-colors",
                      doc.terminKey === p.key ? "border-brand bg-brand-soft/60 text-brand" : "border-line bg-white text-slate-600 hover:border-slate-300"
                    )}
                  >
                    {p.label}
                    <span className="tnum block text-[11px] text-slate-400">{p.pct}% nilai penawaran</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDoc((d) => ({ ...d, terminKey: "custom" }))}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-[12.5px] font-medium transition-colors",
                    doc.terminKey === "custom" ? "border-brand bg-brand-soft/60 text-brand" : "border-line bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  Kustom
                  <span className="block text-[11px] text-slate-400">Tentukan sendiri</span>
                </button>
              </div>

              {doc.terminKey === "custom" && (
                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <Field label="Label Termin">
                    <TextInput
                      value={doc.terminCustomLabel}
                      onChange={(e) => setDoc((d) => ({ ...d, terminCustomLabel: e.target.value }))}
                      placeholder="Mis. Progres Tahap 2"
                    />
                  </Field>
                  <Field label="Persen (%)">
                    <Select
                      value={String(doc.terminPct)}
                      onChange={(e) => setDoc((d) => ({ ...d, terminPct: Number(e.target.value) }))}
                    >
                      {[5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100].map((n) => (
                        <option key={n} value={n}>
                          {n}%
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}

              {parent && (
                <p className="rounded-lg border border-dashed border-line bg-canvas/60 px-3.5 py-2.5 text-[12px] leading-relaxed text-slate-500">
                  Item <b>tidak diinput ulang</b> — {parent.items.length} baris dari {parent.number} otomatis dibawa
                  dengan nilai proporsional {doc.terminPct}% (total {formatRupiah(totals.total)}).
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard step={3} title="Detail & Jatuh Tempo" summary={`Jatuh tempo ${doc.dueDate}`}>
            <div className="space-y-3">
              <Field label="Perihal Invoice" required>
                <TextArea
                  value={doc.subject}
                  onChange={(e) => setDoc((d) => ({ ...d, subject: e.target.value }))}
                  placeholder="Mis. Termin 1 (DP 50%) — Implementasi SIMAK"
                  className="min-h-[56px]"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tanggal Invoice">
                  <DateInput value={doc.date} onChange={(e) => setDoc((d) => ({ ...d, date: e.target.value }))} />
                </Field>
                <Field label="Jatuh Tempo">
                  <DateInput value={doc.dueDate} onChange={(e) => setDoc((d) => ({ ...d, dueDate: e.target.value }))} />
                </Field>
              </div>
              <Field label="Catatan">
                <TextArea value={doc.notes} onChange={(e) => setDoc((d) => ({ ...d, notes: e.target.value }))} className="min-h-[56px]" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard step={4} title="Pajak" summary={`Total ${formatRupiah(totals.total)}`}>
            <TaxToggles tax={doc.tax} onChange={(tax) => setDoc((d) => ({ ...d, tax }))} totals={totals} />
          </SectionCard>
        </>
      ) : (
        /* ── MODE LANGSUNG / REPEAT ORDER ── */
        <>
          <SectionCard step={1} title="Klien" summary={client?.name ?? "Belum dipilih"}>
            <ClientPicker value={doc.clientId} onChange={(id) => setDoc((d) => ({ ...d, clientId: id }))} />
          </SectionCard>

          <SectionCard step={2} title="Detail & Jatuh Tempo" summary={doc.subject || "Perihal belum diisi"}>
            <div className="space-y-3">
              <Field label="Perihal Invoice" required>
                <TextArea value={doc.subject} onChange={(e) => setDoc((d) => ({ ...d, subject: e.target.value }))} className="min-h-[56px]" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tanggal Invoice">
                  <DateInput value={doc.date} onChange={(e) => setDoc((d) => ({ ...d, date: e.target.value }))} />
                </Field>
                <Field label="Jatuh Tempo">
                  <DateInput value={doc.dueDate} onChange={(e) => setDoc((d) => ({ ...d, dueDate: e.target.value }))} />
                </Field>
              </div>
              <Field label="Catatan">
                <TextArea value={doc.notes} onChange={(e) => setDoc((d) => ({ ...d, notes: e.target.value }))} className="min-h-[56px]" />
              </Field>
            </div>
          </SectionCard>

          <SectionCard step={3} title="Rincian Item" summary={`${items.length} baris`}>
            <ItemTableEditor items={doc.items} onChange={(x) => setDoc((d) => ({ ...d, items: x }))} />
          </SectionCard>

          <SectionCard step={4} title="Pajak" summary={`Total ${formatRupiah(totals.total)}`}>
            <TaxToggles tax={doc.tax} onChange={(tax) => setDoc((d) => ({ ...d, tax }))} totals={totals} />
          </SectionCard>
        </>
      )}

      <div className="pb-6">
        <Button className="w-full" size="lg" onClick={publish} disabled={!valid || publishing}>
          Terbitkan Invoice
        </Button>
      </div>
    </BuilderShell>
  );
}
