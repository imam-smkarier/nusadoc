import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  AppData,
  BankAccount,
  Client,
  CompanySettings,
  DocSnapshot,
  Invoice,
  ItemTemplate,
  LineItem,
  Payment,
  Quotation,
  Receipt,
} from "@/lib/types";

/** Konversi baris Prisma → bentuk tipe aplikasi (ISO date string, amount number). */

const dateStr = (d: Date) => d.toISOString().slice(0, 10);

type DbClientRow = Prisma.ClientGetPayload<{}>
type DbQuotationRow = Prisma.QuotationGetPayload<{}>
type DbInvoiceRow = Prisma.InvoiceGetPayload<{}>
type DbPaymentRow = Prisma.PaymentGetPayload<{ include: { receipt: true } }>
type DbReceiptRow = Prisma.ReceiptGetPayload<{}>
type DbTemplateRow = Prisma.ItemTemplateGetPayload<{}>
type DbSettingsRow = Prisma.CompanySettingsGetPayload<{}>

export function mapClient(r: DbClientRow): Client {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    address: r.address,
    city: r.city,
    npwp: r.npwp,
    picName: r.picName,
    picPhone: r.picPhone,
    picEmail: r.picEmail,
    createdAt: dateStr(r.createdAt),
  };
}

function taxFields(r: { ppnEnabled: boolean; ppnRate: number; pph23Enabled: boolean; pph23Rate: number }) {
  return { ppnEnabled: r.ppnEnabled, ppnRate: r.ppnRate, pph23Enabled: r.pph23Enabled, pph23Rate: r.pph23Rate };
}

export function mapQuotation(r: DbQuotationRow): Quotation {
  return {
    id: r.id,
    kind: "quotation",
    number: r.number,
    seq: r.seq,
    status: r.status as Quotation["status"],
    clientId: r.clientId,
    subject: r.subject,
    date: dateStr(r.date),
    validUntil: dateStr(r.validUntil),
    items: r.items as unknown as LineItem[],
    tax: taxFields(r),
    notes: r.notes ?? undefined,
    token: r.token,
    hash: r.hash,
    snapshot: (r.snapshot ?? null) as DocSnapshot | null ?? undefined,
    issuedAt: r.issuedAt.toISOString(),
  };
}

export function mapInvoice(r: DbInvoiceRow): Invoice {
  return {
    id: r.id,
    kind: "invoice",
    number: r.number,
    seq: r.seq,
    terminIndex: r.terminIndex ?? undefined,
    terminLabel: r.terminLabel ?? undefined,
    terminPct: r.terminPct ?? undefined,
    quotationId: r.quotationId ?? undefined,
    clientId: r.clientId,
    subject: r.subject,
    date: dateStr(r.date),
    dueDate: dateStr(r.dueDate),
    items: r.items as unknown as LineItem[],
    tax: taxFields(r),
    notes: r.notes ?? undefined,
    token: r.token,
    hash: r.hash,
    snapshot: (r.snapshot ?? null) as DocSnapshot | null ?? undefined,
    issuedAt: r.issuedAt.toISOString(),
  };
}

/** payment.receiptId disusun dari relasi (FK ada di sisi receipt). */
export function mapPayment(r: DbPaymentRow): Payment {
  return {
    id: r.id,
    invoiceId: r.invoiceId,
    date: dateStr(r.date),
    amount: Number(r.amount),
    method: r.method as Payment["method"],
    note: r.note ?? undefined,
    receiptId: r.receipt?.id ?? "",
  };
}

export function mapReceipt(r: DbReceiptRow): Receipt {
  return {
    id: r.id,
    kind: "receipt",
    number: r.number,
    seq: r.seq,
    paymentId: r.paymentId,
    invoiceId: r.invoiceId,
    clientId: r.clientId,
    amount: Number(r.amount),
    method: r.method as Receipt["method"],
    date: dateStr(r.date),
    forPaymentOf: r.forPaymentOf,
    token: r.token,
    hash: r.hash,
    snapshot: (r.snapshot ?? null) as DocSnapshot | null ?? undefined,
    issuedAt: r.issuedAt.toISOString(),
  };
}

export function mapTemplate(r: DbTemplateRow): ItemTemplate {
  return { id: r.id, name: r.name, items: r.items as unknown as LineItem[] };
}

export function mapSettings(r: DbSettingsRow): CompanySettings {
  return {
    name: r.name,
    tagline: r.tagline,
    address: r.address,
    city: r.city,
    phone: r.phone,
    email: r.email,
    website: r.website,
    npwp: r.npwp,
    signName: r.signName,
    signTitle: r.signTitle,
    signCity: r.signCity,
    ppnDefault: r.ppnDefault,
    defaultNotesQuotation: r.defaultNotesQuotation,
    defaultNotesInvoice: r.defaultNotesInvoice,
    banks: r.banks as unknown as BankAccount[],
  };
}

export async function loadAllData(db: PrismaClient): Promise<AppData> {
  const [clients, quotations, invoices, payments, receipts, templates, settingsRow] = await Promise.all([
    db.client.findMany({ orderBy: { createdAt: "asc" } }),
    db.quotation.findMany({ orderBy: { issuedAt: "desc" } }),
    db.invoice.findMany({ orderBy: { issuedAt: "desc" } }),
    db.payment.findMany({ include: { receipt: true }, orderBy: { date: "asc" } }),
    db.receipt.findMany({ orderBy: { issuedAt: "desc" } }),
    db.itemTemplate.findMany({ orderBy: { name: "asc" } }),
    db.companySettings.findFirst(),
  ]);
  return {
    clients: clients.map(mapClient),
    quotations: quotations.map(mapQuotation),
    invoices: invoices.map(mapInvoice),
    payments: payments.map(mapPayment),
    receipts: receipts.map(mapReceipt),
    templates: templates.map(mapTemplate),
    settings: settingsRow
      ? mapSettings(settingsRow)
      : {
          name: "PT. Nafiga Technology System",
          tagline: "System Integrator — Digital Transformation Partner",
          address: "", city: "", phone: "", email: "", website: "", npwp: "",
          signName: "", signTitle: "", signCity: "",
          ppnDefault: true, defaultNotesQuotation: "", defaultNotesInvoice: "", banks: [],
        },
  };
}

export const asDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
