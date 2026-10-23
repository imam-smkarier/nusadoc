# Architecture — NusaDoc

> Dokumen ini menjelaskan desain teknis yang **ada sekarang** dan boundary yang harus dipertahankan. Untuk kebutuhan produk lihat [PRD.md](./PRD.md); untuk status keamanan dan gap aktual lihat [CURRENT_STATE.md](./CURRENT_STATE.md).

## 1. Diagram

![Arsitektur (diagram warisan DocFlow — belum memuat lapisan SaaS, mobile, delivery)](./assets/docflow-architecture.svg)

Buka langsung untuk resolusi penuh: [docflow-architecture.svg](./assets/docflow-architecture.svg). Diagram ini berasal dari DocFlow; lapisan multi-tenant, billing, delivery, dan API mobile dijelaskan di §4.

---

## 2. Stack

| Lapisan | Implementasi |
| --- | --- |
| Web | Next.js 16 App Router + React 19 + TypeScript |
| Styling | Tailwind CSS 3, Framer Motion, lucide-react |
| Dokumen | React components, qrcode.react, `window.print()` / `@page A4` |
| API | Next.js Route Handlers (`src/app/api`) |
| ORM | Prisma 5.22 |
| Database | MySQL (`nusadoc_dev` pada development lokal) |
| State UI | React Context di `src/lib/store.tsx` |
| Fallback dev | localStorage hanya bila server tak terjangkau, khusus data master non-finansial; aksi finansial gagal tertutup — **bukan** strategi production |

## 3. Struktur Proyek

```text
src/
├── app/
│   ├── (app)/                 # Workspace tenant, dibungkus AppShell (sesi server)
│   ├── api/                   # Route handlers, server-side authority
│   ├── login/ daftar/         # Login & registrasi workspace trial
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

Store client (`src/lib/store.tsx`) meneruskan penolakan server (`ApiError` 402/403/422) ke UI dan tidak pernah membuat dokumen finansial secara lokal. Mode lokal hanya untuk data master saat server tak terjangkau (`NetworkError`).

### Server API

Server adalah sumber kebenaran untuk:

- pembuatan record terbit;
- nomor penawaran/invoice/kwitansi;
- token QR dan hash;
- transaksi Payment + Receipt;
- akses MySQL via Prisma.

Endpoint saat ini (34 route, semua di-scope per workspace kecuali yang ditandai publik). Rincian audit scoping: [AUDIT_PRODUK.md](./AUDIT_PRODUK.md) §3A.

| Endpoint | Fungsi | Akses |
| --- | --- | --- |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Sesi web, profil + kuota workspace | Publik + rate limit / sesi |
| `POST /api/auth/register` | Registrasi workspace trial 30 hari (pendaftar = admin) | Publik + rate limit |
| `GET /api/bootstrap` | Data workspace (seed demo hanya di development) | Sesi |
| `POST /api/clients`, `GET`/`PATCH /api/clients/[id]` | Master klien | `clients.write` |
| `POST /api/quotations`, `PATCH /api/quotations/[id]` | Terbit penawaran (kuota), state machine status | `quotation.write` / `quotation.send`·`decide` |
| `POST /api/invoices` | Terbit invoice langsung/termin (kuota, termin ≤100% terkunci) | `invoice.write` |
| `POST /api/payments` | Payment + kwitansi atomik (kuota, anti-overpayment) | `payment.write` |
| `POST /api/templates`, `DELETE /api/templates/[id]` | Template item | `template.write` |
| `GET`/`PUT /api/settings` | Profil perusahaan workspace | `settings.update` (admin) |
| `GET`/`PUT /api/delivery/settings`, `POST /api/delivery/test`, `GET /api/delivery/logs` | SMTP & WhatsApp per workspace (terenkripsi) | admin |
| `POST /api/reset` | Reset data **workspace demo** | Admin `org_demo`; 404 di production |
| `GET /api/public/validate/[token]` | Validasi QR satu dokumen | Publik, token-scoped + rate limit |
| `GET /api/health` | Cek DB | Publik |
| `POST /api/subscription/checkout` | Order langganan Midtrans Snap untuk workspace sesi | **Admin login** (401 `LOGIN_REQUIRED` untuk tamu) |
| `GET /api/subscription/status` | Paket, kuota, histori workspace | Sesi |
| `GET /api/subscription/[orderId]` | Polling status order (halaman konfirmasi) | Publik (tanpa email/token) |
| `GET /api/subscription/simulated-pay` | Pelunasan simulasi | **Hanya development tanpa server key Midtrans**, admin workspace pemilik, sekali pakai |
| `POST /api/webhooks/midtrans` | Notifikasi pembayaran (SHA-512) → aktivasi workspace pemilik order | Publik, signature-verified ("simulated" hanya dev tanpa server key) |
| `POST /api/mobile/auth/login`, `POST /api/mobile/auth/refresh` | Token mobile (perangkat terikat ke satu akun) | Publik / refresh token |
| `POST /api/mobile/devices/register` | Kunci publik ECDSA / PIN perangkat milik sendiri | Bearer |
| `GET /api/mobile/dashboard`, `GET /api/mobile/approvals/pending`, `GET /api/mobile/documents/[id]` | Ringkasan & dokumen workspace | Bearer |
| `POST /api/mobile/approvals/[id]/sign`, `POST /api/mobile/approvals/[id]/reject` | Persetujuan dari perangkat aktif milik penanda tangan | Bearer + `quotation.decide` |
| `POST /api/mobile/payments/quick-record` | Catat pembayaran + kwitansi dari HP (kuota) | Bearer + `payment.write` |

### Database

Prisma schema menyimpan:

- `Client`: data identitas klien.
- `Quotation`: status, tanggal berlaku, snapshot item JSON, konfigurasi pajak, token/hash.
- `Invoice`: referensi penawaran/termin opsional, due date, snapshot item JSON, token/hash.
- `Payment`: tanggal/nilai/metode pembayaran.
- `Receipt`: hasil penerbitan final, terkait payment melalui FK `paymentId`.
- `ItemTemplate`: kumpulan line item reusable.
- `CompanySettings`: profil penerbit, bank, penandatangan, default.
- `Subscription`: paket langganan/lisensi (Bulanan & Hak Guna), status aktif, nominal, token Snap, dan masa berlaku.
- `SubscriptionLog`: audit trail event Midtrans (`snap.created`, `payment.settled`, `payment.expired`).

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

## 9. Ekstensi Mobile (Flutter) & TTE Biometrik

Cetak biru arsitektur mobile companion, skema pendaftaran perangkat (`DeviceSigner`), dan protokol persetujuan biometrik hardware (Secure Enclave / Android Keystore) didokumentasikan di [MOBILE_APP_CONCEPT.md](./MOBILE_APP_CONCEPT.md).
