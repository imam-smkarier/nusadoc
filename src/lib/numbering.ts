import { invoiceGrandTotal } from "./calc";
import type { Invoice, Payment, Quotation, Receipt } from "./types";

/**
 * Penomoran dokumen:
 *   Penawaran  NTS/QUO/2026/09/001
 *   Invoice    NTS/INV/2026/09/001-T1  (dari penawaran seq 001, termin 1)
 *              NTS/INV/2026/09/002     (langsung / repeat order)
 *   Kwitansi   NTS/KWT/2026/09/001
 */

const pad = (n: number, w = 3) => String(n).padStart(w, "0");

function ym(d: Date): [string, string] {
  return [String(d.getFullYear()), pad(d.getMonth() + 1, 2)];
}

function nextSeq(numbers: string[], prefix: string, y: string, m: string): number {
  const tag = `${prefix}/${y}/${m}/`;
  const max = numbers.reduce((acc, n) => {
    if (!n.startsWith(tag)) return acc;
    const tail = n.slice(tag.length);
    const seq = parseInt(tail.split("-")[0], 10);
    return Number.isFinite(seq) ? Math.max(acc, seq) : acc;
  }, 0);
  return max + 1;
}

export function nextQuotationNumber(quotations: Quotation[], now = new Date()): { number: string; seq: number } {
  return nextQuotationNumberFor(quotations.map((q) => q.number), now);
}

export function nextQuotationNumberFor(numbers: string[], now = new Date()): { number: string; seq: number } {
  const [y, m] = ym(now);
  const seq = nextSeq(numbers, "NTS/QUO", y, m);
  return { number: `NTS/QUO/${y}/${m}/${pad(seq)}`, seq };
}

/**
 * Invoice dari penawaran: memakai nomor urut penawaran induk sebagai basis,
 * dengan akhiran -T{termin}. Invoice langsung: urut register sendiri.
 */
export function nextInvoiceNumber(
  invoices: Invoice[],
  quotation?: Quotation,
  terminIndex?: number,
  now = new Date()
): { number: string; seq: number } {
  return nextInvoiceNumberFor(
    invoices.filter((i) => !i.terminIndex).map((i) => i.number),
    quotation,
    terminIndex,
    now
  );
}

/** Varian untuk server: cukup daftar nomor invoice langsung yang sudah ada. */
export function nextInvoiceNumberFor(
  directNumbers: string[],
  quotation?: Quotation,
  terminIndex?: number,
  now = new Date()
): { number: string; seq: number } {
  const [y, m] = ym(now);
  if (quotation && terminIndex) {
    return { number: `NTS/INV/${y}/${m}/${pad(quotation.seq)}-T${terminIndex}`, seq: quotation.seq };
  }
  const seq = nextSeq(directNumbers, "NTS/INV", y, m);
  return { number: `NTS/INV/${y}/${m}/${pad(seq)}`, seq };
}

export function nextTerminIndex(invoices: Invoice[], quotationId?: string): number {
  if (!quotationId) return 0;
  return invoices.filter((i) => i.quotationId === quotationId).length + 1;
}

export function nextReceiptNumber(receipts: Receipt[], now = new Date()): { number: string; seq: number } {
  return nextReceiptNumberFor(receipts.map((r) => r.number), now);
}

export function nextReceiptNumberFor(numbers: string[], now = new Date()): { number: string; seq: number } {
  const [y, m] = ym(now);
  const seq = nextSeq(numbers, "NTS/KWT", y, m);
  return { number: `NTS/KWT/${y}/${m}/${pad(seq)}`, seq };
}

export function paymentSummary(invoice: Invoice, payments: Payment[]) {
  const paid = payments.filter((p) => p.invoiceId === invoice.id).reduce((s, p) => s + p.amount, 0);
  const total = invoiceGrandTotal(invoice);
  return { paid, total, outstanding: Math.max(0, total - paid) };
}
