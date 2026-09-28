"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { computeTotals } from "./calc";
import { computeDocumentHash } from "./hash";
import { nextInvoiceNumber, nextQuotationNumber, nextReceiptNumber, nextTerminIndex } from "./numbering";
import { buildSeedData } from "./seed";
import { generateToken } from "./token";
import type {
  AppData,
  Client,
  CompanySettings,
  Invoice,
  ItemTemplate,
  LineItem,
  Payment,
  Quotation,
  QuotationStatus,
  Receipt,
  TaxConfig,
} from "./types";
import { todayISO, uid } from "./utils";

const STORAGE_KEY = "docflow:data:v1";

export interface NewQuotationInput {
  clientId: string;
  subject: string;
  date: string;
  validUntil: string;
  items: LineItem[];
  tax: TaxConfig;
  notes?: string;
}

export interface NewInvoiceInput {
  clientId: string;
  subject: string;
  date: string;
  dueDate: string;
  items: LineItem[];
  tax: TaxConfig;
  notes?: string;
  quotationId?: string;
  terminLabel?: string;
  terminPct?: number;
}

export interface NewPaymentInput {
  date: string;
  amount: number;
  method: Payment["method"];
  note?: string;
  forPaymentOf?: string;
}

interface AppContextValue {
  /** true bila API/database tak terjangkau — aplikasi jalan mode mock lokal */
  localMode: boolean;
  data: AppData;
  ready: boolean;
  /* master */
  addClient: (c: Omit<Client, "id" | "code" | "createdAt">) => Promise<Client>;
  updateClient: (id: string, patch: Partial<Client>) => Promise<void>;
  /* alur dokumen */
  issueQuotation: (input: NewQuotationInput) => Promise<Quotation>;
  setQuotationStatus: (id: string, status: QuotationStatus) => Promise<void>;
  issueInvoice: (input: NewInvoiceInput) => Promise<Invoice>;
  addPayment: (invoiceId: string, input: NewPaymentInput) => Promise<Receipt>;
  /* pendukung */
  saveTemplate: (name: string, items: LineItem[]) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<CompanySettings>) => Promise<void>;
  resetDemoData: () => Promise<void>;
  /* lookup */
  clientById: (id?: string) => Client | undefined;
  quotationById: (id?: string) => Quotation | undefined;
  invoiceById: (id?: string) => Invoice | undefined;
  receiptById: (id?: string) => Receipt | undefined;
  paymentsForInvoice: (invoiceId: string) => Payment[];
  invoicesForQuotation: (quotationId: string) => Invoice[];
}

const AppContext = createContext<AppContextValue | null>(null);

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

/** Muat data terakhir dari localStorage — hanya untuk mode fallback mock. */
function loadLocalData(): AppData {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed && parsed.settings && Array.isArray(parsed.clients)) return parsed;
    }
  } catch {
    /* abaikan */
  }
  return buildSeedData();
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => buildSeedData());
  const [ready, setReady] = useState(false);
  const [localMode, setLocalMode] = useState(false);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    (async () => {
      try {
        const d = await api<AppData>("/api/bootstrap");
        setData(d);
      } catch (e) {
        console.warn("API tidak terjangkau — jalan mode mock localStorage:", e);
        setLocalMode(true);
        setData(loadLocalData());
      }
      setReady(true);
    })();
  }, []);

  // persistensi lokal hanya dipakai saat fallback
  useEffect(() => {
    if (!ready || !localMode) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* kuota penuh */
    }
  }, [data, ready, localMode]);

  /** Jalankan lewat API; bila gagal, eksekusi fallback lokal agar demo tetap hidup. */
  const guard = useCallback(async <T,>(financial: boolean, call: () => Promise<T>, fallback: () => T): Promise<T> => {
    try {
      return await call();
    } catch (e) {
      console.warn("Aksi API gagal — fallback lokal:", e);
      setLocalMode(true);
      return fallback();
    }
  }, []);

  const mutate = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);

  /* ── fallback lokal (mock): logika lama ── */

  const fallbackAddClient = useCallback(
    (c: Omit<Client, "id" | "code" | "createdAt">): Client => {
      const client: Client = {
        ...c,
        id: uid("cli"),
        code: `CL-${String(dataRef.current.clients.length + 1).padStart(3, "0")}`,
        createdAt: todayISO(),
      };
      mutate((d) => ({ ...d, clients: [...d.clients, client] }));
      return client;
    },
    [mutate]
  );

  const fallbackIssueQuotation = useCallback(
    (input: NewQuotationInput): Quotation => {
      const now = new Date();
      const { number, seq } = nextQuotationNumber(dataRef.current.quotations, now);
      const q: Quotation = {
        id: uid("quo"), kind: "quotation", number, seq, status: "draft",
        clientId: input.clientId, subject: input.subject, date: input.date, validUntil: input.validUntil,
        items: input.items, tax: input.tax, notes: input.notes,
        token: generateToken(),
        hash: computeDocumentHash("quotation", { number, seq, clientId: input.clientId, subject: input.subject, date: input.date, validUntil: input.validUntil, items: input.items, tax: input.tax, notes: input.notes }),
        issuedAt: now.toISOString(),
      };
      mutate((d) => ({ ...d, quotations: [q, ...d.quotations] }));
      return q;
    },
    [mutate]
  );

  const fallbackIssueInvoice = useCallback(
    (input: NewInvoiceInput): Invoice => {
      const now = new Date();
      const parent = input.quotationId ? dataRef.current.quotations.find((q) => q.id === input.quotationId) : undefined;
      const terminIndex = input.terminPct ? nextTerminIndex(dataRef.current.invoices, input.quotationId) : undefined;
      const { number, seq } = nextInvoiceNumber(dataRef.current.invoices, parent, terminIndex, now);
      const inv: Invoice = {
        id: uid("inv"), kind: "invoice", number, seq, terminIndex,
        terminLabel: input.terminLabel, terminPct: input.terminPct, quotationId: input.quotationId,
        clientId: input.clientId, subject: input.subject, date: input.date, dueDate: input.dueDate,
        items: input.items, tax: input.tax, notes: input.notes,
        token: generateToken(),
        hash: computeDocumentHash("invoice", { number, seq, clientId: input.clientId, subject: input.subject, date: input.date, dueDate: input.dueDate, items: input.items, tax: input.tax, notes: input.notes, quotationId: input.quotationId ?? null, terminIndex: terminIndex ?? null, terminLabel: input.terminLabel ?? null, terminPct: input.terminPct ?? null }),
        issuedAt: now.toISOString(),
      };
      mutate((d) => ({ ...d, invoices: [inv, ...d.invoices] }));
      return inv;
    },
    [mutate]
  );

  const fallbackAddPayment = useCallback(
    (invoiceId: string, input: NewPaymentInput): Receipt => {
      const now = new Date();
      const invoice = dataRef.current.invoices.find((i) => i.id === invoiceId);
      const paymentId = uid("pay");
      const { number, seq } = nextReceiptNumber(dataRef.current.receipts, now);
      const receipt: Receipt = {
        id: uid("rcp"), kind: "receipt", number, seq, paymentId, invoiceId,
        clientId: invoice?.clientId ?? "", amount: input.amount, method: input.method,
        date: input.date,
        forPaymentOf: input.forPaymentOf ?? (invoice ? `${invoice.subject} — s.n. ${invoice.number}` : "Pembayaran invoice"),
        token: generateToken(),
        hash: computeDocumentHash("receipt", { number, seq, paymentId, invoiceId, clientId: invoice?.clientId ?? "", amount: input.amount, method: input.method, date: input.date, forPaymentOf: input.forPaymentOf ?? (invoice ? `${invoice.subject} — s.n. ${invoice.number}` : "Pembayaran invoice") }),
        issuedAt: now.toISOString(),
      };
      const payment: Payment = { id: paymentId, invoiceId, date: input.date, amount: input.amount, method: input.method, note: input.note, receiptId: receipt.id };
      mutate((d) => ({ ...d, payments: [...d.payments, payment], receipts: [receipt, ...d.receipts] }));
      return receipt;
    },
    [mutate]
  );

  /* ── aksi publik: API-first ── */

  const addClient = useCallback(
    (c: Omit<Client, "id" | "code" | "createdAt">) =>
      guard(false, async () => {
        const client = await api<Client>("/api/clients", { method: "POST", body: JSON.stringify(c) });
        mutate((d) => ({ ...d, clients: [...d.clients, client] }));
        return client;
      }, () => fallbackAddClient(c)),
    [guard, mutate, fallbackAddClient]
  );

  const updateClient = useCallback(
    (id: string, patch: Partial<Client>) =>
      guard(false, async () => {
        const client = await api<Client>(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        mutate((d) => ({ ...d, clients: d.clients.map((x) => (x.id === id ? client : x)) }));
      }, () => mutate((d) => ({ ...d, clients: d.clients.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))),
    [guard, mutate]
  );

  const issueQuotation = useCallback(
    (input: NewQuotationInput) =>
      guard(true, async () => {
        const q = await api<Quotation>("/api/quotations", { method: "POST", body: JSON.stringify(input) });
        mutate((d) => ({ ...d, quotations: [q, ...d.quotations] }));
        return q;
      }, () => fallbackIssueQuotation(input)),
    [guard, mutate, fallbackIssueQuotation]
  );

  const setQuotationStatus = useCallback(
    (id: string, status: QuotationStatus) =>
      guard(true, async () => {
        const q = await api<Quotation>(`/api/quotations/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
        mutate((d) => ({ ...d, quotations: d.quotations.map((x) => (x.id === id ? q : x)) }));
      }, () => mutate((d) => ({ ...d, quotations: d.quotations.map((x) => (x.id === id ? { ...x, status } : x)) }))),
    [guard, mutate]
  );

  const issueInvoice = useCallback(
    (input: NewInvoiceInput) =>
      guard(true, async () => {
        const inv = await api<Invoice>("/api/invoices", { method: "POST", body: JSON.stringify(input) });
        mutate((d) => ({ ...d, invoices: [inv, ...d.invoices] }));
        return inv;
      }, () => fallbackIssueInvoice(input)),
    [guard, mutate, fallbackIssueInvoice]
  );

  const addPayment = useCallback(
    (invoiceId: string, input: NewPaymentInput) =>
      guard(true, async () => {
        const { payment, receipt } = await api<{ payment: Payment; receipt: Receipt }>("/api/payments", {
          method: "POST",
          body: JSON.stringify({ invoiceId, ...input }),
        });
        mutate((d) => ({ ...d, payments: [...d.payments, payment], receipts: [receipt, ...d.receipts] }));
        return receipt;
      }, () => fallbackAddPayment(invoiceId, input)),
    [guard, mutate, fallbackAddPayment]
  );

  const saveTemplate = useCallback(
    (name: string, items: LineItem[]) =>
      guard(false, async () => {
        const tpl = await api<ItemTemplate>("/api/templates", { method: "POST", body: JSON.stringify({ name, items }) });
        mutate((d) => ({ ...d, templates: [...d.templates, tpl] }));
      }, () => mutate((d) => ({ ...d, templates: [...d.templates, { id: uid("tpl"), name, items: structuredClone(items) }] }))),
    [guard, mutate]
  );

  const deleteTemplate = useCallback(
    (id: string) =>
      guard(false, async () => {
        await api(`/api/templates/${id}`, { method: "DELETE" });
        mutate((d) => ({ ...d, templates: d.templates.filter((t) => t.id !== id) }));
      }, () => mutate((d) => ({ ...d, templates: d.templates.filter((t) => t.id !== id) }))),
    [guard, mutate]
  );

  const updateSettings = useCallback(
    (patch: Partial<CompanySettings>) =>
      guard(false, async () => {
        const merged = { ...dataRef.current.settings, ...patch };
        const settings = await api<CompanySettings>("/api/settings", { method: "PUT", body: JSON.stringify(merged) });
        mutate((d) => ({ ...d, settings }));
      }, () => mutate((d) => ({ ...d, settings: { ...d.settings, ...patch } }))),
    [guard, mutate]
  );

  const resetDemoData = useCallback(
    () =>
      guard(false, async () => {
        setData(await api<AppData>("/api/reset", { method: "POST" }));
      }, () => setData(buildSeedData())),
    [guard]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      localMode,
      data,
      ready,
      addClient,
      updateClient,
      issueQuotation,
      setQuotationStatus,
      issueInvoice,
      addPayment,
      saveTemplate,
      deleteTemplate,
      updateSettings,
      resetDemoData,
      clientById: (id) => data.clients.find((c) => c.id === id),
      quotationById: (id) => data.quotations.find((q) => q.id === id),
      invoiceById: (id) => data.invoices.find((i) => i.id === id),
      receiptById: (id) => data.receipts.find((r) => r.id === id),
      paymentsForInvoice: (invoiceId) => data.payments.filter((p) => p.invoiceId === invoiceId),
      invoicesForQuotation: (quotationId) => data.invoices.filter((i) => i.quotationId === quotationId),
    }),
    [localMode, data, ready, addClient, updateClient, issueQuotation, setQuotationStatus, issueInvoice, addPayment, saveTemplate, deleteTemplate, updateSettings, resetDemoData]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp harus dipakai di dalam AppStoreProvider");
  return ctx;
}

/** Totals siap pakai untuk dokumen (memakai computeTotals). */
export function useTotals(items: LineItem[], tax: TaxConfig) {
  return useMemo(() => computeTotals(items, tax), [items, tax]);
}
