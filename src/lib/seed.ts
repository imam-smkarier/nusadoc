import { computeDocumentHash } from "./hash";
import type { DocSnapshot, TaxConfig } from "./types";
import { computeTotals } from "./calc";

/** Snapshot demo: kunci penerbit/klien saat "terbit" agar konsisten dgn dokumen nyata. */
function seedSnapshot(client: Client, items: LineItem[], tax: TaxConfig): DocSnapshot {
  const totals = computeTotals(items, tax);
  return seedSnapshotFromTotals(client, totals);
}
function seedSnapshotFromTotals(client: Client, totals: DocSnapshot["totals"]): DocSnapshot {
  return {
    issuer: {
      name: seedSettings.name, tagline: seedSettings.tagline, address: seedSettings.address,
      city: seedSettings.city, phone: seedSettings.phone, email: seedSettings.email,
      website: seedSettings.website, npwp: seedSettings.npwp, signName: seedSettings.signName,
      signTitle: seedSettings.signTitle, signCity: seedSettings.signCity, banks: seedSettings.banks,
    },
    client: {
      name: client.name, address: client.address, city: client.city, npwp: client.npwp,
      picName: client.picName, picPhone: client.picPhone, picEmail: client.picEmail,
    },
    totals,
  };
}
function clientByIdSeed(id: string): Client {
  return seedClients.find((c) => c.id === id)!;
}
import type { AppData, Client, CompanySettings, Invoice, ItemTemplate, LineItem, Payment, Quotation, Receipt } from "./types";

/* ── Klien master ── */

export const seedClients: Client[] = [
  {
    id: "cli-001",
    code: "CL-001",
    name: "PT Bank Sejahtera Nusantara",
    address: "Jl. Cikini Raya No. 42",
    city: "Jakarta Pusat",
    npwp: "01.887.654.3-092.000",
    picName: "Andini Prameswari",
    picPhone: "+62 811-2200-345",
    picEmail: "andini.p@bsn.co.id",
    createdAt: "2026-02-10",
  },
  {
    id: "cli-002",
    code: "CL-002",
    name: "Dinas Kesehatan Provinsi Jawa Barat",
    address: "Jl. Karaca No. 7, Complex Kartika Sari",
    city: "Bandung",
    npwp: "01.998.776.6-501.000",
    picName: "dr. Reza Fauzan, M.Kes",
    picPhone: "+62 812-3456-7890",
    picEmail: "simkes.dinkes@jabarprov.go.id",
    createdAt: "2026-05-02",
  },
  {
    id: "cli-003",
    code: "CL-003",
    name: "PT Maju Logistik Indonesia",
    address: "Kawasan Industri MM2100 Blok F-12",
    city: "Bekasi",
    npwp: "03.112.233.4-423.678",
    picName: "Hendra Wijaya",
    picPhone: "+62 813-9988-1122",
    picEmail: "hendra.w@majulogisti.co.id",
    createdAt: "2026-06-18",
  },
  {
    id: "cli-004",
    code: "CL-004",
    name: "Koperasi Digital Nusantara",
    address: "Jl. Cikini Raya No. 42",
    city: "Jakarta Pusat",
    npwp: "00.556.677.8-013.901",
    picName: "Ratna Sari",
    picPhone: "+62 878-6655-4433",
    picEmail: "ratna@koperasidn.id",
    createdAt: "2026-03-25",
  },
];

/* ── Item ── */

const li = (id: string, name: string, description: string, qty: number, unit: string, unitPrice: number): LineItem => ({
  id, name, description, qty, unit, unitPrice,
});

const QUO1_ITEMS: LineItem[] = [
  li("it-q1-1", "Lisensi SIMAK Aset Digital (perpetual)", "50 lisensi pengguna, modul aset & barcode", 50, "lisensi", 2_500_000),
  li("it-q1-2", "Implementasi, konfigurasi & integrasi", "Setup server, konfigurasi modul, integrasi core banking", 1, "paket", 180_000_000),
  li("it-q1-3", "Migrasi data aset legacy", "Ekstraksi, pembersihan, dan impor data 12 sistem lama", 1, "paket", 60_000_000),
  li("it-q1-4", "Pelatihan admin & pengguna", "On-site training di kantor pusat & 2 cabang", 2, "sesi", 12_500_000),
  li("it-q1-5", "Perangkat server & barcode scanner bundle", "1 server HPE ProLiant ML350 + 8 unit scanner Zebra DS2208", 1, "unit", 45_000_000),
];

const pctItems = (items: LineItem[], pct: number) =>
  items.map((it, i) => ({ ...it, id: `${it.id}-t${pct}-${i}`, unitPrice: Math.round((it.unitPrice * pct) / 100) }));

/* ── Penawaran ── */

export const seedQuotations: Quotation[] = [
  {
    id: "quo-001",
    kind: "quotation",
    number: "NTS/QUO/2026/08/001",
    seq: 1,
    status: "approved",
    clientId: "cli-001",
    subject: "Implementasi SIMAK Aset Digital — Sistem Manajemen Aset Terintegrasi",
    date: "2026-08-04",
    validUntil: "2026-09-03",
    items: QUO1_ITEMS,
    tax: { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    notes:
      "Harga berlaku sampai tanggal kedaluwarsa di atas. Termin pembayaran: DP 50%, progres 30% (BAST modul), retensi 20% (30 hari go-live). Garansi implementasi 90 hari.",
    token: "NTS-7K2MQ4X9PZLA",
    hash: "",
    issuedAt: "2026-08-04T09:15:00.000Z",
  },
  {
    id: "quo-002",
    kind: "quotation",
    number: "NTS/QUO/2026/09/001",
    seq: 1,
    status: "sent",
    clientId: "cli-002",
    subject: "Pengadaan Server & Infrastruktur Jaringan Data Center Dinkes Jabar",
    date: "2026-09-08",
    validUntil: "2026-10-08",
    items: [
      li("it-q2-1", "Rack server HPE ProLiant DL380 Gen11", "2× Xeon Silver, 128GB RAM, 8× 1.2TB SAS", 2, "unit", 85_000_000),
      li("it-q2-2", "Switch managed 48-port + firewall appliance", "Cisco Catalyst 9200L + FortiGate 100F dengan lisensi 1 tahun", 1, "paket", 95_000_000),
      li("it-q2-3", "Instalasi & konfigurasi jaringan data center", "Structured cabling, VLAN, redundancy, dokumentasi as-built", 1, "paket", 65_000_000),
      li("it-q2-4", "Maintenance infrastruktur 12 bulan", "Monitoring 24/7, kunjungan preventif bulanan, SLA respons 4 jam", 12, "bulan", 3_500_000),
    ],
    tax: { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    notes: "Penawaran mengikat selama masa berlaku. Pengiriman 4-6 minggu setelah PO diterima.",
    token: "NTS-M8VQ2JH5RTW7",
    hash: "",
    issuedAt: "2026-09-08T10:30:00.000Z",
  },
  {
    id: "quo-003",
    kind: "quotation",
    number: "NTS/QUO/2026/09/002",
    seq: 2,
    status: "draft",
    clientId: "cli-003",
    subject: "Pengembangan Portal Layanan Pelanggan (Web & Mobile Web)",
    date: "2026-09-12",
    validUntil: "2026-10-12",
    items: [
      li("it-q3-1", "Pengembangan portal layanan pelanggan", "Frontend web + mobile web, portal tracking kiriman & tiket CS", 1, "paket", 145_000_000),
      li("it-q3-2", "Desain UX & prototyping", "Riset pengguna, design system, prototipe interaktif", 1, "paket", 32_500_000),
      li("it-q3-3", "Integrasi API sistem logistik existing", "REST integration dengan WMS & TMS internal", 1, "paket", 48_000_000),
    ],
    tax: { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    notes: "",
    token: "NTS-P3NW9DKCVB6A",
    hash: "",
    issuedAt: "2026-09-12T14:05:00.000Z",
  },
  {
    id: "quo-004",
    kind: "quotation",
    number: "NTS/QUO/2026/07/003",
    seq: 3,
    status: "rejected",
    clientId: "cli-004",
    subject: "Sistem Kasir (POS) Multi-Outlet Koperasi Digital",
    date: "2026-07-14",
    validUntil: "2026-08-13",
    items: [li("it-q4-1", "Aplikasi POS multi-outlet + dashboard", "Termasuk modul stok, member, dan laporan konsolidasi", 5, "outlet", 18_000_000)],
    tax: { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    notes: "",
    token: "NTS-Q5YT8RB3MWX2",
    hash: "",
    issuedAt: "2026-07-14T11:00:00.000Z",
  },
];

/* ── Invoice ──
 * T1 = DP 50% dari QUO/2026/08/001 → LUNAS (kwitansi ada)
 * T2 = Progres 30% dari QUO/2026/08/001 → JATUH TEMPO (belum dibayar, due lewat)
 * INV/2026/09/002 = repeat order tanpa penawaran → TERBAYAR SEBAGIAN
 */

export const seedInvoices: Invoice[] = [
  {
    id: "inv-001",
    kind: "invoice",
    number: "NTS/INV/2026/08/001-T1",
    seq: 1,
    terminIndex: 1,
    terminLabel: "Uang Muka (DP) 50%",
    terminPct: 50,
    quotationId: "quo-001",
    clientId: "cli-001",
    subject: "Termin 1 (DP 50%) — Implementasi SIMAK Aset Digital",
    date: "2026-08-06",
    dueDate: "2026-08-21",
    items: pctItems(QUO1_ITEMS, 50),
    tax: { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    notes: "Mohon cantumkan nomor invoice pada berita transfer.",
    token: "NTS-J6HD4PL8QKZ5",
    hash: "",
    issuedAt: "2026-08-06T08:20:00.000Z",
  },
  {
    id: "inv-002",
    kind: "invoice",
    number: "NTS/INV/2026/08/001-T2",
    seq: 1,
    terminIndex: 2,
    terminLabel: "Progres Pekerjaan 30%",
    terminPct: 30,
    quotationId: "quo-001",
    clientId: "cli-001",
    subject: "Termin 2 (Progres 30%) — Implementasi SIMAK Aset Digital",
    date: "2026-08-25",
    dueDate: "2026-09-05",
    items: pctItems(QUO1_ITEMS, 30),
    tax: { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    notes: "Tagihan diterbitkan setelah BAST modul migrasi data ditandatangani.",
    token: "NTS-V2CN7RM3THB9",
    hash: "",
    issuedAt: "2026-08-25T09:40:00.000Z",
  },
  {
    id: "inv-003",
    kind: "invoice",
    number: "NTS/INV/2026/09/002",
    seq: 2,
    quotationId: undefined,
    clientId: "cli-004",
    subject: "Perpanjangan Lisensi SIMAK & Support Premium 12 Bulan",
    date: "2026-08-28",
    dueDate: "2026-09-12",
    items: [
      li("it-inv3-1", "Perpanjangan lisensi SIMAK tahunan", "25 lisensi pengguna, masa aktif Okt 2026 – Sep 2027", 25, "lisensi", 1_200_000),
      li("it-inv3-2", "Support premium 12 bulan", "Helpdesk prioritas, update minor, SLA respons 8 jam", 12, "bulan", 1_500_000),
    ],
    tax: { ppnEnabled: true, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    notes: "Repeat order tanpa penawaran — sesuai kontrak support tahunan.",
    token: "NTS-X9FB5WS6DNH4",
    hash: "",
    issuedAt: "2026-08-28T13:10:00.000Z",
  },
];

/* ── Pembayaran & Kwitansi ── */

export const seedPayments: Payment[] = [
  {
    id: "pay-001",
    invoiceId: "inv-001",
    date: "2026-08-20",
    amount: 241_425_000,
    method: "Transfer Bank",
    note: "Transfer BCA a.n. PT Bank Sejahtera Nusantara",
    receiptId: "rcp-001",
  },
  {
    id: "pay-002",
    invoiceId: "inv-003",
    date: "2026-09-02",
    amount: 25_000_000,
    method: "Transfer Bank",
    note: "Pembayaran pertama, sisanya menyusul akhir bulan",
    receiptId: "rcp-002",
  },
];

export const seedReceipts: Receipt[] = [
  {
    id: "rcp-001",
    kind: "receipt",
    number: "NTS/KWT/2026/08/001",
    seq: 1,
    paymentId: "pay-001",
    invoiceId: "inv-001",
    clientId: "cli-001",
    amount: 241_425_000,
    method: "Transfer Bank",
    date: "2026-08-20",
    forPaymentOf: "Termin 1 (DP 50%) Implementasi SIMAK Aset Digital",
    token: "NTS-K3TR9XQ6MJB2",
    hash: "",
    issuedAt: "2026-08-20T15:45:00.000Z",
  },
  {
    id: "rcp-002",
    kind: "receipt",
    number: "NTS/KWT/2026/09/001",
    seq: 1,
    paymentId: "pay-002",
    invoiceId: "inv-003",
    clientId: "cli-004",
    amount: 25_000_000,
    method: "Transfer Bank",
    date: "2026-09-02",
    forPaymentOf: "Perpanjangan Lisensi SIMAK & Support Premium (pembayaran sebagian)",
    token: "NTS-W7LN2PD5VKC8",
    hash: "",
    issuedAt: "2026-09-02T16:20:00.000Z",
  },
];

/* ── Template item & pengaturan ── */

export const seedTemplates: ItemTemplate[] = [
  {
    id: "tpl-001",
    name: "Paket Lisensi & Implementasi SIMAK",
    items: [
      li("tpl1-1", "Lisensi SIMAK (perpetual)", "Per modul pengguna", 10, "lisensi", 2_500_000),
      li("tpl1-2", "Implementasi & konfigurasi", "Setup, konfigurasi, integrasi", 1, "paket", 90_000_000),
      li("tpl1-3", "Pelatihan pengguna", "On-site / remote training", 1, "sesi", 12_500_000),
    ],
  },
  {
    id: "tpl-002",
    name: "Kontrak Maintenance Bulanan",
    items: [li("tpl2-1", "Maintenance infrastruktur TI", "Monitoring, preventif, SLA respons 4 jam", 12, "bulan", 3_500_000)],
  },
];

export const seedSettings: CompanySettings = {
  name: "PT. SMKarier Inovasi Digital",
  tagline: "Sistem Dokumen Bisnis — Aman, Cepat, Terverifikasi",
  address: "Menara Nusadoc Lt. 12, Jl. TB Simatupang No. 88",
  city: "Jakarta Selatan",
  phone: "+62 812-9000-1122",
  email: "hello@nusadoc.id",
  website: "www.nusadoc.id",
  npwp: "01.234.567.8-901.000",
  signName: "Imam Najmudin",
  signTitle: "Direktur Utama",
  signCity: "Jakarta",
  ppnDefault: true,
  defaultNotesQuotation:
    "Harga berlaku sampai tanggal kedaluwarsa di atas. Garansi implementasi 90 hari setelah go-live.",
  defaultNotesInvoice: "Mohon cantumkan nomor invoice pada berita transfer.",
  banks: [
    { id: "bank-001", bank: "BCA", number: "123-456-7890", holder: "PT. Nusadoc Technology System" },
    { id: "bank-002", bank: "Bank Mandiri", number: "112-000-9876543", holder: "PT. Nusadoc Technology System" },
  ],
};

export function buildSeedData(): AppData {
  // Hash kanonik dihitung ulang saat seed dibangun agar selaras dengan API & verifikasi publik.
  const quotations = seedQuotations.map((q) => ({
    ...q,
    hash: computeDocumentHash("quotation", {
      number: q.number, seq: q.seq, clientId: q.clientId, subject: q.subject,
      date: q.date, validUntil: q.validUntil, items: q.items, tax: q.tax, notes: q.notes,
    }),
    snapshot: seedSnapshot(clientByIdSeed(q.clientId), q.items, q.tax),
  }));
  const invoices = seedInvoices.map((i) => ({
    ...i,
    hash: computeDocumentHash("invoice", {
      number: i.number, seq: i.seq, clientId: i.clientId, subject: i.subject,
      date: i.date, dueDate: i.dueDate, items: i.items, tax: i.tax, notes: i.notes,
      quotationId: i.quotationId ?? null, terminIndex: i.terminIndex ?? null,
      terminLabel: i.terminLabel ?? null, terminPct: i.terminPct ?? null,
    }),
    snapshot: seedSnapshot(clientByIdSeed(i.clientId), i.items, i.tax),
  }));
  const receipts = seedReceipts.map((r) => {
    const snap = seedSnapshot(clientByIdSeed(r.clientId), [], { ppnEnabled: false, ppnRate: 0, pph23Enabled: false, pph23Rate: 0 });
    snap.totals.total = r.amount;
    return {
      ...r,
      hash: computeDocumentHash("receipt", {
        number: r.number, seq: r.seq, paymentId: r.paymentId, invoiceId: r.invoiceId,
        clientId: r.clientId, amount: r.amount, method: r.method, date: r.date,
        forPaymentOf: r.forPaymentOf,
      }),
      snapshot: snap,
    };
  });
  return {
    clients: seedClients,
    quotations,
    invoices,
    payments: seedPayments,
    receipts,
    templates: seedTemplates,
    settings: seedSettings,
  };
}
