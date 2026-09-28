# Architecture — Nafiga DocFlow

> Dokumen ini menjelaskan desain teknis yang **ada sekarang** dan boundary yang harus dipertahankan. Untuk kebutuhan produk lihat [PRD.md](./PRD.md); untuk status keamanan dan gap aktual lihat [CURRENT_STATE.md](./CURRENT_STATE.md).

## 1. Diagram

![Nafiga DocFlow architecture](./assets/docflow-architecture.svg)

Buka langsung untuk resolusi penuh: [docflow-architecture.svg](./assets/docflow-architecture.svg).

---

## 2. Stack

| Lapisan | Implementasi |
| --- | --- |
| Web | Next.js 16 App Router + React 19 + TypeScript |
| Styling | Tailwind CSS 3, Framer Motion, lucide-react |
| Dokumen | React components, qrcode.react, `window.print()` / `@page A4` |
| API | Next.js Route Handlers (`src/app/api`) |
| ORM | Prisma 5.22 |
| Database | MySQL (`nafiga_docflow` pada development lokal) |
| State UI | React Context di `src/lib/store.tsx` |
| Fallback dev | localStorage bila `/api/bootstrap` gagal — **bukan** strategi production |

## 3. Struktur Proyek

```text
src/
├── app/
│   ├── (app)/                 # Workspace internal, dibungkus AppShell/auth mock
│   ├── api/                   # Route handlers, server-side authority
│   ├── login/                 # Login UI (auth mock)
│   └── v/[token]/             # Validasi publik tanpa login
├── components/
│   ├── app/                   # Shell, navigasi, kartu validasi
│   ├── builder/               # Builder split-screen & draft localStorage
│   ├── documents/             # Keluarga komponen A4
│   └── ui/                    # Primitive, form, modal/toast
└── lib/
    ├── server/                # Prisma singleton, mapping, seed database
    ├── calc.ts                # Total & status kalkulatif
    ├── numbering.ts           # Format nomor dokumen
    ├── hash.ts / token.ts     # Hash visual & token acak
    ├── store.tsx              # API-first client context
    └── types.ts               # Kontrak domain client-side
prisma/schema.prisma           # Kontrak model MySQL
```

## 4. Boundary Tanggung Jawab

### Client

Tanggung jawab client hanya:

- interaksi user, builder, preview, format tampilan, autosave **draft** lokal;
- memanggil API;
- menampilkan data yang diberikan server.

Client **tidak boleh** menjadi sumber kebenaran untuk:

- nomor dokumen final;
- token validasi;
- hash final;
- status invoice;
- izin/otorisasi;
- perhitungan batas pembayaran atau termin untuk security/integrity.

Catatan saat ini: beberapa aturan tersebut masih punya validasi UI atau fallback lokal untuk mode development. Lihat gap di `CURRENT_STATE.md`.

### Server API

Server adalah sumber kebenaran untuk:

- pembuatan record terbit;
- nomor penawaran/invoice/kwitansi;
- token QR dan hash;
- transaksi Payment + Receipt;
- akses MySQL via Prisma.

Endpoint saat ini:

| Endpoint | Fungsi | Akses saat ini |
| --- | --- | --- |
| `GET /api/bootstrap` | Load semua data, seed bila kosong | Tidak terautentikasi — dev only behavior |
| `POST /api/clients` | Tambah klien | Belum auth |
| `PATCH /api/clients/[id]` | Ubah klien | Belum auth |
| `POST /api/quotations` | Terbit penawaran | Belum auth |
| `PATCH /api/quotations/[id]` | Ubah status penawaran | Belum auth |
| `POST /api/invoices` | Terbit invoice | Belum auth |
| `POST /api/payments` | Payment + kwitansi transaksi | Belum auth |
| `POST /api/templates` | Simpan template | Belum auth |
| `DELETE /api/templates/[id]` | Hapus template | Belum auth |
| `PUT /api/settings` | Simpan pengaturan | Belum auth |
| `POST /api/reset` | Hapus & seed demo | Belum auth; dev only |

> Endpoint write tanpa auth adalah **blocker production**, bukan feature yang selesai. Jangan expose aplikasi ini ke publik/internet sebelum middleware auth dan authorization ada.

### Database

Prisma schema menyimpan:

- `Client`: data identitas klien.
- `Quotation`: status, tanggal berlaku, snapshot item JSON, konfigurasi pajak, token/hash.
- `Invoice`: referensi penawaran/termin opsional, due date, snapshot item JSON, token/hash.
- `Payment`: tanggal/nilai/metode pembayaran.
- `Receipt`: hasil penerbitan final, terkait payment melalui FK `paymentId`.
- `ItemTemplate`: kumpulan line item reusable.
- `CompanySettings`: profil penerbit, bank, penandatangan, default.

### Mengapa item disimpan JSON?

Untuk fase awal, item line disimpan JSON agar bentuk record di database sama dengan kontrak TypeScript `LineItem[]` dan carry-over sederhana. Konsekuensi:

- bagus untuk rendering snapshot dokumen;
- kurang ideal untuk laporan per-item, pencarian kompleks, pajak per-line, atau perubahan quantity granular.

Normalisasi ke `DocumentLineItem` perlu dilakukan ketika fitur reporting/purchasing memerlukannya. Jangan melakukan normalisasi parsial tanpa migration plan serta mapper compatibility.

## 5. Siklus Penerbitan Dokumen

### Penawaran

1. Client builder mengirim payload dokumen.
2. API menentukan sequence/nomor, token acak, hash.
3. Prisma menyimpan penawaran dan API mengembalikan record serialisasi ISO string.
4. QR di sheet menggunakan `/v/[token]` pada origin aktif.

### Invoice dari Penawaran

1. Builder hanya menampilkan penawaran berstatus Disetujui.
2. Client membawa data klien dan menskalakan item sesuai persen termin untuk preview.
3. API harus memverifikasi induk/termin (hardening belum lengkap).
4. Invoice menyimpan `quotationId`, `terminIndex`, `terminLabel`, `terminPct` dan snapshot item.

### Pembayaran dan Kwitansi

1. Admin memasukkan nominal dan metode.
2. API memuat invoice, membuat `Payment`, lalu `Receipt` dalam satu `$transaction`.
3. API mengembalikan payment dan receipt.
4. Status invoice tidak disimpan; `computeInvoiceStatus()` menghitungnya dari record pembayaran.

## 6. Status & Perhitungan

`src/lib/calc.ts` adalah pusat kalkulasi frontend.

```text
Subtotal = Σ(qty × unitPrice)
PPN      = subtotal × rate, bila aktif
PPh 23   = subtotal × rate, bila aktif
Total    = subtotal + PPN − PPh23

Invoice:
  paid ≥ total      => Lunas
  paid > 0          => Terbayar Sebagian
  paid = 0 & late   => Jatuh Tempo
  selainnya         => Terkirim
```

Saat menambah backend hardening, buat fungsi kalkulasi server-side yang diuji dan jadikan client hanya menggunakan hasilnya atau implementasi shared yang sama. Jangan menciptakan rumus kedua yang dapat drift.

## 7. Print dan Validasi Publik

- `.print-area` adalah satu-satunya bagian yang boleh terlihat pada media print.
- `DocumentSheet` adalah kanvas A4 bersama untuk semua tipe dokumen.
- Print CSS mematikan fill besar agar hemat tinta dan menyisakan garis/border.
- `/v/[token]` publik memuat data berdasarkan token, menampilkan preview serta `window.print()`.

Saat auth nyata ditambahkan, route `/v/[token]` harus tetap publik **hanya** untuk data yang memang dimaksudkan tampil ke penerima dokumen. Jangan mengekspos catatan internal, identitas user, log, atau data klien lain.

## 8. Deployment Target

Target akhirnya Hostinger Node.js yang mendukung Node 20+, MySQL, SSH/Node.js App. Sebelum deploy:

1. gunakan migration Prisma versioned (`prisma migrate deploy`), bukan `db push`;
2. env production disimpan di hPanel/Node.js App, tidak di repository;
3. nonaktifkan seed/reset demo;
4. aktifkan auth/RBAC/authorization; 
5. jalankan backup dan observability.

Detail aktual dan gate deployment ada di [CURRENT_STATE.md](./CURRENT_STATE.md).
