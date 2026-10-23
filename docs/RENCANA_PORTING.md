# Rencana Porting DocFlow → NusaDoc & Strategi Dua Produk

| Properti | Nilai |
| --- | --- |
| Tanggal | 13 Oktober 2026 |
| Status | **USULAN — menunggu persetujuan Imam. Belum ada fitur DocFlow yang di-port.** |
| Sumber | `nafiga-docflow` commit `7db637e` (13 Okt 2026; `docs/AUDIT_PRODUK.md`, `docs/CURRENT_STATE.md` §9–§12) |
| Target | `nusadoc` branch `feat/saas-multitenant` (commit `d2a743a` + perbaikan sesi 13 Okt) |
| Terkait | [AUDIT_PRODUK.md](./AUDIT_PRODUK.md) — temuan, roadmap Tahap 0–4, metrik |

---

## 1. Temuan teknis yang menentukan biaya porting

**Commit pertama DocFlow (`a875785`, 29 Sep 2026 01:44) praktis sama dengan basis fork NusaDoc** (`VERIFIED-LOCAL`, diff per file):

| File | NusaDoc vs `a875785` | DocFlow sejak `a875785` |
| --- | --- | --- |
| `src/lib/calc.ts` | 0 baris | 373 baris |
| `src/app/(app)/invoice/[id]/page.tsx` | 0 baris | 217 baris |
| `src/components/builder/QuotationBuilder.tsx` | 4 baris | 310 baris |
| `src/lib/types.ts` | 8 baris | 96 baris |
| `src/lib/server/validation.ts` | 9 baris | 145 baris |

Karena itu porting **tidak perlu ditulis ulang**. Bisa dilakukan merge 3-arah per file: `ours` = NusaDoc, `base` = DocFlow `a875785`, `theirs` = DocFlow `HEAD`.

**Simulasi merge 3-arah** (di scratchpad, repo tidak disentuh, `VERIFIED-LOCAL`):

| Hasil | Jumlah | Keterangan |
| --- | --- | --- |
| File diubah DocFlow, merge bersih | 28 | Terutama domain & UI dokumen: `calc.ts`, halaman detail, sheet dokumen, builder invoice, validasi |
| File diubah DocFlow, konflik | 28 | 10 di antaranya dokumen/konfigurasi (`docs/*`, `AGENTS.md`, `README.md`, `package*.json`, `.env.example`, `.gitignore`). **18 file kode**, kebanyakan 1–4 hunk: `store.tsx` (6), `schema.prisma` (6), `invoices/route.ts` (4), `AppShell.tsx` (4), `quotations/route.ts` (3), `payments/route.ts`, `quotations/[id]/route.ts`, `clients/[id]/route.ts`, `seedDb.ts`, `QuotationBuilder.tsx`, `QuotationSheet.tsx` (2 masing-masing), lalu `map.ts`, `sequence.ts`, `types.ts`, `dashboard`, `penawaran/[id]`, `login`, `ItemTableEditor` (1 masing-masing) |
| File baru di DocFlow | 23 | Route `activity`, `export`, `invoices/[id]/void`, `payments/[id]/void`, `documents/email`, `collections/reminders`, `dev/mail-preview`; modul `revision.ts`, `emailCopy.ts`, `email.ts`, `exportWorkbook.ts`, `quotationData.ts`; komponen `VoidDialog`, `ExportDialog`, `ActivityCard`, `ProjectPositionCard`, `RevisionDiffPanel`, `SendDocumentDialog`; halaman `penagihan`, `penawaran/[id]/edit`; 3 migration |
| File dihapus DocFlow | 1 | `src/lib/numbering.ts` — di NusaDoc juga sudah tidak dipakai kode aplikasi setelah store gagal tertutup (hanya `tests/unit/domain.test.ts`) |

**Risiko utama: merge bersih ≠ aman tenant.** Ke-7 route baru DocFlow ditulis untuk satu perusahaan. Contohnya `prisma.invoice.findUnique({ where: { id } })` tanpa `organizationId`. Merge-nya akan bersih tetapi membuka IDOR lintas tenant. Karena itu **setiap route baru wajib lolos checklist §4 dan punya test integration lintas tenant** dengan pola yang sama seperti `tests/integration/tenant-isolation.test.ts`.

Tiga bug yang diperbaiki di sesi ini (store, counter termin, AppShell) juga sudah diperbaiki di DocFlow dengan cara serupa. Konfliknya diselesaikan dengan mengambil versi DocFlow (lebih lengkap: rantai revisi, void), lalu memasang kembali scoping org, kuota, dan delivery NusaDoc.

---

## 2. Tabel fitur × effort × catatan tenant/kuota

Ukuran mencakup merge, scoping tenant, test, dan cek browser: **S** ≈ ≤ ½ hari · **M** ≈ 1–2 hari · **L** ≈ > 2 hari. Kolom "Mobile" menandai endpoint `/api/mobile/*` milik NusaDoc (tidak ada di DocFlow) yang ikut berubah. Model data aplikasi Flutter `nusadoc-mobile` belum diperiksa (`OPEN`).

### Tahap 1 — "Jangan kalah dari Word"

| # | Fitur DocFlow | Sumber utama | Ukuran | Catatan tenant | Catatan kuota | Mobile |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Edit draft penawaran (A1) | `PUT quotations/[id]`, `penawaran/[id]/edit` | S | `PUT` wajib `findFirst({id, organizationId})` | Edit draft bukan dokumen baru | — |
| P2 | Revisi `-R{n}` + ringkasan perubahan (A2) | `quotations` POST `revisionOf`, `revision.ts`, `RevisionDiffPanel` | M | `revisionOf` & `rootId` wajib satu org; klaim `supersededById` atomik | **Keputusan Q1** | Penawaran tergantikan tidak boleh muncul di `approvals/pending` & tidak boleh di-sign |
| P3 | Duplikat penawaran (A2) | builder `?copy=` | S | Sumber dari store (sudah per org) | Dihitung (dokumen baru) | — |
| P4 | Diskon baris & dokumen (A3) | `calc.ts`, `validation.ts`, builder, sheet | M (bersih) | Agnostik | — | `computeTotals` dipakai `mobile/dashboard` & `mobile/documents` — ikut signature baru |
| P5 | No. PO otomatis ke termin + syarat terstruktur (A6) | `clientPo`, `clientRef`, `terms` | S | Agnostik | — | Tampilkan di detail dokumen mobile (opsional) |
| P6 | Qty desimal (A7) | `validation.ts`, `calc.ts` | S | Agnostik | — | **Periksa parser Flutter** (int → num) |
| P7 | Status jatuh tempo untuk invoice dibayar sebagian (B5), kartu dashboard (B8), label peran (C10) | `calc.ts`, dashboard, AppShell | S | Agnostik | — | `mobile/dashboard` sudah menghitung overdue dari sisa > 0 |
| P8 | Hapus `src/lib/numbering.ts` + test-nya | — | S | — | — | — |

### Tahap 2 — "Hitungan yang dipercaya finance"

| # | Fitur DocFlow | Sumber utama | Ukuran | Catatan tenant | Catatan kuota | Mobile |
| --- | --- | --- | --- | --- | --- | --- |
| P9 | Termin Ringkas/Rinci tanpa selisih kontrak + kotak Posisi Termin (B1, B2) | `calc.ts` `buildTerminInvoice`, `invoices/route.ts` | M | Konflik di `invoices/route.ts`: gabungkan counter per **rantai** penawaran (DocFlow) + kunci sebelum hitung total (perbaikan S4a NusaDoc) + scoping org + `assertCanPublish` | — | — |
| P10 | PPh 23 hanya atas jasa (B3) | Jenis item Barang/Jasa di JSON item | M (bersih) | Agnostik | — | Tampilkan jenis item (opsional) |
| P11 | Potongan pajak klien (PPh 23/22/4(2)/PPN WAPU + No. bukti potong) & biaya transfer (B4) | `Payment.withholdings`, `bankFee`, `settledAmount` | M | Agnostik | Kwitansi tetap dihitung | **`mobile/payments/quick-record`** harus menerima/menyimpan potongan atau minimal memakai `settledAmount`; `mobile/dashboard` piutang harus memakai `settledAmount` |
| P12 | Void beralasan + invoice pengganti (A4) | `invoices/[id]/void`, `payments/[id]/void`, `replacesId`, `VoidDialog` | L | **Route baru — wajib scoping org** + RBAC finance/admin; `replacesId` satu org; QR publik menampilkan DIBATALKAN | **Keputusan Q2/Q3** | Invoice batal dikecualikan dari piutang & daftar; dokumen batal tidak bisa di-sign |
| P13 | Kotak meterai > Rp5 juta (B7) | `SignatureBlock`, detail kwitansi | S | Agnostik | — | — |
| P14 | PPN 12% × DPP nilai lain 11/12 + klien pemungut (B6) | `Client.vatCollector`, `ppnDppNilaiLain`, dialog bayar | M | `Client` sudah per org | — | `computeTotals` di endpoint mobile |

### Tahap 3 — "Alasan membayar"

| # | Fitur DocFlow | Sumber utama | Ukuran | Catatan tenant | Catatan kuota | Mobile |
| --- | --- | --- | --- | --- | --- | --- |
| P15 | **Prasyarat:** `AuditLog.organizationId` | Migration baru + backfill (aktor email → `User.organizationId`; aktor sistem → org dari entitas) + `logAudit(orgId, …)` di ±13 pemanggil | M | Tanpa ini riwayat aktivitas membocorkan aktivitas lintas tenant | — | `mobile/dashboard` beralih filter ke `organizationId` |
| P16 | Riwayat aktivitas (C5) | `GET /api/activity`, `ActivityCard` | S (setelah P15) | **Route baru** — filter org + entitas milik org | — | — |
| P17 | Kirim dokumen dari layar (C1) | `SendDocumentDialog`, `emailCopy.ts` | M | **Jangan port `email.ts` DocFlow** (SMTP dari env, satu perusahaan). Pakai `delivery.ts` NusaDoc (SMTP & WA per org, terenkripsi). **Teaser WhatsApp "Segera hadir" diganti kanal WA aktif** (Fonnte/WaBlas) + fallback tautan `wa.me` tanpa konfigurasi. Sekaligus perbaiki penerbit hardcode (`deliver-doc.ts:56`) | Pengiriman tidak dihitung kuota dokumen (**Q4** untuk batas kirim per paket) | — |
| P18 | Ekspor Excel 5 sheet + umur piutang (C4) | `exportWorkbook.ts`, `GET /api/export`, `ExportDialog`, dependensi `exceljs` | M | **Route baru** — semua query filter org; hanya finance/admin; rate limit | **Q5** fitur paket? | — |
| P19 | Metrik rata-rata hari tagih | `collectionStats()` | S | Otomatis per org; tambahkan agregat platform untuk metrik SaaS | — | Kartu di dashboard mobile (opsional) |
| P20 | Pusat penagihan + posisi proyek + tagih sisa (C2, C3) | `penagihan/page.tsx`, `ProjectPositionCard`, `POST collections/reminders` | M | **Route baru** — scoping org; pengingat lewat delivery NusaDoc; "terakhir diingatkan" dari `DeliveryLog` (sudah per org) | — | — |
| P21 | **Scheduler pengingat jatuh tempo** (tidak ada di DocFlow) | Endpoint cron bersecret + job harian | M | Iterasi per org dengan `DeliverySettings` aktif | Q4 | — |

**Total kasar:** Tahap 1 ≈ 3–4 hari · Tahap 2 ≈ 4–6 hari · Tahap 3 ≈ 4–6 hari, termasuk test. Satu developer, belum termasuk uji pengguna dan penyesuaian aplikasi Flutter.

---

## 3. Keputusan kuota yang perlu Imam ambil

Saat ini kuota Lite menghitung penawaran + invoice + kwitansi berdasarkan `issuedAt` ≥ awal bulan, dan draft ikut terhitung (`src/lib/server/plan.ts:35-41`).

| # | Pertanyaan | Usulan | Alasan |
| --- | --- | --- | --- |
| Q1 | Apakah revisi `-R{n}` dihitung? | **Tidak** — satu rantai revisi = satu dokumen | Kalau dihitung, negosiasi menghukum pelanggan Lite dan NusaDoc kembali "kalah dari Word". Risiko penyalahgunaan rendah karena rantai terikat ke klien & penawaran asal |
| Q2 | Apakah void mengembalikan kuota? | **Tidak** | Dokumen sudah terbit dan QR-nya mungkin sudah beredar. Mencegah siklus void→terbit untuk "menghemat" kuota |
| Q3 | Apakah invoice pengganti (`replacesId`) dihitung? | **Tidak** | Ini koreksi, bukan dokumen baru. Bersama Q2, satu kesalahan = satu kuota |
| Q4 | Apakah kirim email/WA & pengingat dibatasi per paket? | Tidak dihitung kuota dokumen; batasi laju per org (anti-spam) | Biaya WA ditanggung tenant (token Fonnte/WaBlas milik tenant) |
| Q5 | Ekspor Excel untuk semua paket? | Ya | Akuntan meminta Excel; menahannya mendorong pelanggan kembali ke Excel |
| Q6 | Draft dihitung? | Tetap seperti sekarang sampai A1 diputuskan (nomor dibuat saat simpan) | Mengubah titik hitung berarti mengubah alur penomoran — keputusan terpisah |

Apa pun keputusannya, aturan hitung kuota dipusatkan di `plan.ts` dan diuji. Pengecekan kuota juga dipindah ke dalam transaksi (temuan S3 di audit).

---

## 4. Checklist wajib setiap fitur yang di-port

1. Setiap query baca/tulis/hapus memfilter `organizationId`. Setiap referensi silang (`clientId`, `quotationId`, `invoiceId`, `revisionOf`, `replacesId`) dicek milik org yang sama.
2. Endpoint yang menerbitkan dokumen memanggil `assertCanPublish` (setelah S3: di dalam transaksi).
3. RBAC memakai `requirePermission` dengan peta di `src/lib/permissions.ts`. Mobile memakai `can()` yang sama.
4. Endpoint `/api/mobile/*` yang menghitung nilai memakai fungsi `calc.ts` yang sama (bukan rumus kedua).
5. Migration dibuat lewat `prisma migrate diff` → folder migration → `prisma migrate deploy` (bukan `db push`) dan diberi timestamp setelah `20261002020000`. Migration DocFlow tidak disalin mentah.
6. Test integration lintas tenant (org A tidak bisa membaca atau mengubah milik org B) + test kebenaran domain dari DocFlow ikut dibawa.
7. Hash dokumen lama tetap valid. DocFlow memverifikasi ini (9/9, 10/10); ulangi pada data `nusadoc_dev`.
8. Copy UI mengikuti AUDIT_PRODUK §3D (tanpa klaim "sah", "anti-palsu", atau angka tanpa data).

---

## 5. Urutan eksekusi yang diusulkan

1. **Tahap 0 dari AUDIT_PRODUK dulu** (sisa celah keamanan + klaim). Porting tidak boleh menambah permukaan serangan di atas celah yang masih terbuka.
2. Branch `feat/port-docflow-tahap1` dari `feat/saas-multitenant`. Merge 3-arah per file (skrip seperti simulasi §1), selesaikan 18 konflik kode, lalu buat migration NusaDoc untuk kolom Tahap 1.
3. Jalankan checklist §4 per fitur, lalu build, test, cek browser, dan update docs. Satu commit per fitur.
4. Ulangi untuk Tahap 2 dan 3 (P15 sebelum P16–P20).
5. Selama porting berjalan, **DocFlow dibekukan untuk fitur baru** (bugfix saja) agar target tidak bergerak. Lihat §6.

---

## 6. Strategi dua produk

### Opsi

| | (a) Port manual terus-menerus | (b) NusaDoc jadi inti; Nafiga = satu tenant / instalasi Hak Guna white-label | (c) Paket inti bersama (monorepo) |
| --- | --- | --- | --- |
| Cara kerja | Dua repo hidup; setiap fitur & bugfix dikerjakan dua kali | Satu codebase. Nafiga memakai NusaDoc sebagai workspace cloud **atau** instalasi Hak Guna di servernya sendiri, dari tag rilis yang sama | Domain (`calc`, hash, penomoran, validasi, komponen dokumen) diekstrak ke paket bersama; dua aplikasi tetap terpisah |
| Biaya awal | 0 | Porting (Tahap 1–3, ≈ 11–16 hari) + white-label & mode single-tenant (≈ 3–5 hari) + migrasi data Nafiga (≈ 2–3 hari termasuk gladi) | Refactor ekstraksi paket (≈ 5–10 hari), **ditambah** porting yang sama karena API/UI tetap terpisah |
| Biaya perawatan | **±2× per fitur & per bugfix**, dan terus membesar. Bukti: setelah hanya 2 minggu sudah ada 28 file konflik, dan 3 bug yang diperbaiki DocFlow masih ada di NusaDoc | **1×** | ±1,3–1,5×: domain dibagi, tetapi route API, store, shell, dan auth tetap dua kali |
| Risiko utama | Drift diam-diam (bug fix tidak menyeberang); dua produk dengan perilaku pajak berbeda | Operasional Nafiga bergantung pada codebase SaaS. Mitigasi: instalasi terpisah yang dipin ke tag rilis, fitur SaaS (billing, kuota, registrasi) bisa dimatikan lewat env | Kompleksitas build/tooling; menyelesaikan bagian yang **sudah mudah** (domain merge bersih), bukan bagian yang konflik (API/store/shell) |
| Cocok bila | Kedua produk memang akan berbeda total | Produknya sama: alur penawaran → termin → kwitansi yang sama, beda merek & data | Ada ≥ 2 aplikasi berbeda pasar yang hanya berbagi mesin hitung |

### Rekomendasi: (b) NusaDoc sebagai inti

Data simulasi merge menunjukkan konflik **tidak** ada di logika domain. Konfliknya ada di lapisan API, store, dan shell, yaitu persis lapisan yang di opsi (c) tetap harus dirawat dua kali. Jadi (c) mahal di depan tanpa menyelesaikan masalah utamanya. Opsi (a) yang paling mahal dalam jangka panjang, dan buktinya sudah terlihat dalam dua minggu.

Opsi (b) juga menutup celah produk yang ditemukan audit: **paket Hak Guna on-premise yang dijual Rp19,9 jt belum pernah ada wujudnya.** Menjadikan Nafiga instalasi Hak Guna pertama memaksa paket itu benar-benar dibuat (Docker/runbook, mode single-tenant, white-label, EULA), dan sekaligus menghasilkan pelanggan referensi.

**Prasyarat teknis (b):**

| Prasyarat | Mengapa | Ukuran |
| --- | --- | --- |
| Prefix nomor per org (`NSD/` saat ini di-hardcode di `src/lib/server/sequence.ts:28-47`) | Dokumen Nafiga memakai `NTS/` dan nomor lama tidak boleh berubah | M |
| Logo, penerbit, dan email per org (`DocumentHeader`, `deliver-doc.ts:56`) | White-label | M |
| Mode single-tenant via env (matikan `/daftar`, landing, checkout, kuota; plan `hakguna`) | Instalasi on-premise | M |
| Migrasi data `nafiga_docflow` → skema NusaDoc (`organizationId = org_nafiga`), **mempertahankan token & hash** | QR yang sudah tercetak di dokumen Nafiga harus tetap valid di domain Nafiga | M–L, dengan gladi di salinan DB dan verifikasi `hashValid` 100% |
| Paket instalasi (Dockerfile/compose atau runbook Hostinger), backup terjadwal, prosedur update dari tag rilis | Hak Guna sungguhan | M–L |

**Urutan:**
1. Bekukan fitur DocFlow (bugfix saja). Setiap bugfix dicatat dengan label "port ke NusaDoc".
2. Port Tahap 1–3 ke NusaDoc (§5).
3. Buat prasyarat white-label + single-tenant.
4. Lakukan gladi migrasi Nafiga di salinan DB.
5. Cutover Nafiga ke instalasi NusaDoc (atau workspace cloud bila Nafiga tidak mensyaratkan server sendiri).
6. Arsipkan `nafiga-docflow`.

**Keputusan tetap di Imam.** Hal yang perlu dikonfirmasi terlebih dulu:
- Hubungan bisnis PT Nafiga ↔ PT SMKarier: apakah Nafiga menjadi pelanggan Hak Guna, dan dengan lisensi apa?
- Apakah Nafiga mensyaratkan data di server sendiri? Bila tidak, workspace cloud jauh lebih murah dari instalasi.
- Apakah ada fitur khusus Nafiga yang tidak boleh menjadi fitur umum?
