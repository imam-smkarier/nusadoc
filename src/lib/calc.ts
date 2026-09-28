import type { Invoice, InvoiceStatus, LineItem, Payment, Quotation, QuotationStatus, TaxConfig } from "./types";
import { daysBetween, todayISO } from "./utils";

export interface DocTotals {
  subtotal: number;
  discount: number;
  ppn: number;
  pph23: number;
  total: number;
}

/** Semua angka yang bisa dihitung sistem — admin tidak pernah menghitung manual. */
export function computeTotals(items: LineItem[], tax: TaxConfig): DocTotals {
  const subtotal = items.reduce((s, it) => s + Math.round(it.qty * it.unitPrice), 0);
  const ppn = tax.ppnEnabled ? Math.round((subtotal * tax.ppnRate) / 100) : 0;
  const pph23 = tax.pph23Enabled ? Math.round((subtotal * tax.pph23Rate) / 100) : 0;
  return { subtotal, discount: 0, ppn, pph23, total: subtotal + ppn - pph23 };
}

export const quotationTotals = (q: Quotation) => computeTotals(q.items, q.tax);
export const invoiceGrandTotal = (i: Invoice) => computeTotals(i.items, i.tax).total;

/**
 * Status invoice DIHITUNG dari akumulasi kwitansi — tidak pernah diubah manual:
 *   Lunas · Terbayar Sebagian · Jatuh Tempo · Terkirim
 */
export function computeInvoiceStatus(invoice: Invoice, payments: Payment[]): InvoiceStatus {
  const { paid, outstanding } = paymentSummaryOf(invoice, payments);
  if (outstanding <= 0 && paid > 0) return "paid";
  if (paid > 0) return "partial";
  if (invoice.dueDate && daysBetween(invoice.dueDate, todayISO()) > 0) return "overdue";
  return "sent";
}

export function paymentSummaryOf(invoice: Invoice, payments: Payment[]) {
  const related = payments.filter((p) => p.invoiceId === invoice.id);
  const paid = related.reduce((s, p) => s + p.amount, 0);
  const total = invoiceGrandTotal(invoice);
  return { paid, total, outstanding: Math.max(0, total - paid), count: related.length };
}

/**
 * Status penawaran tampilan: Kedaluwarsa dihitung otomatis bila masih "Terkirim"
 * melewati masa berlaku — tidak perlu diubah manual.
 */
export function effectiveQuotationStatus(q: Quotation): QuotationStatus {
  if (q.status === "sent" && q.validUntil && daysBetween(q.validUntil, todayISO()) > 0) return "expired";
  return q.status;
}

/** Item penawaran diskalakan ke nilai proporsional termin (round per baris ke rupiah). */
export function scaleItems(items: LineItem[], pct: number): LineItem[] {
  const f = pct / 100;
  return items.map((it) => ({ ...it, unitPrice: Math.round(it.unitPrice * f) }));
}

export const TERMIN_PRESETS = [
  { key: "dp30", label: "Uang Muka (DP) 30%", pct: 30 },
  { key: "dp50", label: "Uang Muka (DP) 50%", pct: 50 },
  { key: "progres", label: "Progres Pekerjaan", pct: 30 },
  { key: "retensi", label: "Retensi", pct: 20 },
  { key: "final", label: "Pelunasan (100%)", pct: 100 },
] as const;
