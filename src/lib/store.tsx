"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { computeTotals } from "./calc";
import { buildSeedData } from "./seed";
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

/** Server tidak terjangkau (jaringan putus / DB mati) — satu-satunya kondisi boleh fallback lokal. */
export class NetworkError extends Error {}

/**
 * Server menjawab dengan penolakan (validasi 422, hak akses 403, kuota/langganan 402, …).
 * Pesan server ditampilkan apa adanya; `code` mis. DOCUMENT_QUOTA_EXCEEDED.
 */
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      ...init,
    });
  } catch {
    throw new NetworkError("Server tidak terjangkau");
  }
  if (res.status === 503) throw new NetworkError("Database tidak terjangkau");
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    throw new ApiError(body.error || `Permintaan gagal (${res.status})`, res.status, body.code);
  }
  return (await res.json()) as T;
}

/**
 * Penolakan server selalu diteruskan ke pemanggil. Hanya saat server tak terjangkau:
 * aksi non-finansial jatuh ke mode lokal, aksi finansial gagal tertutup — dokumen
 * tidak boleh "terbit" hanya di browser (dan kuota 402 tidak boleh terakali tampilan).
 */
export async function guarded<T>(
  financial: boolean,
  call: () => Promise<T>,
  fallback: () => T,
  onOffline: () => void
): Promise<T> {
  try {
    return await call();
  } catch (e) {
    if (!(e instanceof NetworkError)) throw e;
    console.warn("Server tidak terjangkau:", e);
    onOffline();
    if (financial) throw new Error("Server tidak terjangkau — dokumen tidak diterbitkan. Coba lagi saat koneksi pulih.");
    return fallback();
  }
}

/** Aksi yang hanya sah di server — tanpa padanan lokal. */
function serverOnly(): never {
  throw new Error("Server tidak terjangkau — aksi ini membutuhkan koneksi ke server.");
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

  const guard = useCallback(
    <T,>(financial: boolean, call: () => Promise<T>, fallback: () => T): Promise<T> =>
      guarded(financial, call, fallback, () => setLocalMode(true)),
    []
  );

  const mutate = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), []);

  /* ── fallback lokal (mock) — hanya untuk data master non-finansial ── */

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
      }, serverOnly),
    [guard, mutate]
  );

  const setQuotationStatus = useCallback(
    (id: string, status: QuotationStatus) =>
      guard(true, async () => {
        const q = await api<Quotation>(`/api/quotations/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
        mutate((d) => ({ ...d, quotations: d.quotations.map((x) => (x.id === id ? q : x)) }));
      }, serverOnly),
    [guard, mutate]
  );

  const issueInvoice = useCallback(
    (input: NewInvoiceInput) =>
      guard(true, async () => {
        const inv = await api<Invoice>("/api/invoices", { method: "POST", body: JSON.stringify(input) });
        mutate((d) => ({ ...d, invoices: [inv, ...d.invoices] }));
        return inv;
      }, serverOnly),
    [guard, mutate]
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
      }, serverOnly),
    [guard, mutate]
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
