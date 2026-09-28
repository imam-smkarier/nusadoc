/**
 * Nusadoc — kontrak domain client/API, selaras dengan Prisma/MySQL.
 * localStorage hanya dipakai untuk autosave draft atau fallback development;
 * dokumen terbit bersumber dari API server-side.
 */

export type DocKind = "quotation" | "invoice" | "receipt";

/**
 * Snapshot immutable yang dikunci saat dokumen DITERBITKAN.
 * Perubahan master klien/pengaturan setelahnya TIDAK mengubah dokumen historis.
 */
export interface DocSnapshot {
  issuer: Pick<
    CompanySettings,
    "name" | "tagline" | "address" | "city" | "phone" | "email" | "website" | "npwp" | "signName" | "signTitle" | "signCity" | "banks"
  >;
  client: Pick<Client, "name" | "address" | "city" | "npwp" | "picName" | "picPhone" | "picEmail">;
  /** Nilai final terkunci saat terbit (server-side). */
  totals: { subtotal: number; ppn: number; pph23: number; total: number };
}

/** Ambil pihak dari snapshot dokumen; null bila dokumen lama tanpa snapshot. */
export function partiesFromDoc(doc: { snapshot?: DocSnapshot | null; clientId: string }): {
  client?: Client;
  settings?: CompanySettings;
} | null {
  if (!doc.snapshot) return null;
  return {
    client: { id: doc.clientId, code: "", createdAt: "", ...doc.snapshot.client },
    settings: { ...emptySettings(), ...doc.snapshot.issuer },
  };
}

function emptySettings(): CompanySettings {
  return {
    name: "", tagline: "", address: "", city: "", phone: "", email: "", website: "", npwp: "",
    signName: "", signTitle: "", signCity: "", ppnDefault: true,
    defaultNotesQuotation: "", defaultNotesInvoice: "", banks: [],
  };
}

export interface Client {
  id: string;
  code: string; // mis. CL-001
  name: string;
  address: string;
  city: string;
  npwp: string;
  picName: string;
  picPhone: string;
  picEmail: string;
  createdAt: string; // ISO date
}

export interface LineItem {
  id: string;
  name: string;
  description?: string;
  qty: number;
  unit: string; // unit, sesi, bulan, lisensi, dst.
  unitPrice: number; // rupiah
}

export interface TaxConfig {
  ppnEnabled: boolean;
  ppnRate: number; // 11
  pph23Enabled: boolean;
  pph23Rate: number; // 2 — dipotong pemberi kerja
}

export type QuotationStatus = "draft" | "sent" | "approved" | "rejected" | "expired";

export interface Quotation {
  id: string;
  kind: "quotation";
  number: string; // NTS/QUO/2026/09/001
  seq: number; // 1
  status: QuotationStatus;
  clientId: string;
  subject: string;
  date: string; // ISO date — tanggal dokumen
  validUntil: string; // ISO date — masa penawaran berlaku
  items: LineItem[];
  tax: TaxConfig;
  notes?: string; // catatan / syarat tambahan di badan dokumen
  token: string; // token validasi acak
  hash: string; // SHA-256 visual dokumen
  snapshot?: DocSnapshot; // terkunci saat terbit
  issuedAt: string; // ISO datetime — saat diterbitkan (final)
}

export type InvoiceStatus = "sent" | "partial" | "paid" | "overdue";

/** Status invoice TIDAK disimpan — dihitung dari akumulasi kwitansi. */
export interface Invoice {
  id: string;
  kind: "invoice";
  number: string; // NTS/INV/2026/09/001-T1 (dari penawaran) atau NTS/INV/2026/09/002 (langsung)
  seq: number;
  terminIndex?: number; // 1,2,3.. jika lahir dari penawaran
  terminLabel?: string; // "Uang Muka (DP) 50%"
  terminPct?: number; // 50
  quotationId?: string; // referensi induk — kosong untuk repeat order
  clientId: string;
  subject: string;
  date: string;
  dueDate: string;
  items: LineItem[]; // carry-over dari penawaran (nilai proporsional termin)
  tax: TaxConfig;
  notes?: string;
  token: string;
  hash: string;
  snapshot?: DocSnapshot;
  issuedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  date: string;
  amount: number;
  method: "Transfer Bank" | "Tunai" | "QRIS" | "Virtual Account" | "Cek/Giro";
  note?: string;
  receiptId: string;
}

/** Kwitansi: tanpa draft — sekali terbit final. */
export interface Receipt {
  id: string;
  kind: "receipt";
  number: string; // NTS/KWT/2026/09/001
  seq: number;
  paymentId: string;
  invoiceId: string; // referensi induk
  clientId: string;
  amount: number;
  method: Payment["method"];
  date: string;
  forPaymentOf: string; // "Untuk Pembayaran ..."
  token: string;
  hash: string;
  snapshot?: DocSnapshot;
  issuedAt: string;
}

export interface BankAccount {
  id: string;
  bank: string;
  number: string;
  holder: string;
}

export interface CompanySettings {
  name: string;
  tagline: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  npwp: string;
  signName: string;
  signTitle: string;
  signCity: string;
  ppnDefault: boolean;
  defaultNotesQuotation: string;
  defaultNotesInvoice: string;
  banks: BankAccount[];
}

export interface ItemTemplate {
  id: string;
  name: string;
  items: LineItem[];
}

export interface AppData {
  clients: Client[];
  quotations: Quotation[];
  invoices: Invoice[];
  payments: Payment[];
  receipts: Receipt[];
  templates: ItemTemplate[];
  settings: CompanySettings;
}
