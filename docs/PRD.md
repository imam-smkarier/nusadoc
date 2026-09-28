# Product Requirements Document (PRD) — Nafiga DocFlow

| Properti | Nilai |
| --- | --- |
| Produk | Nafiga DocFlow |
| Modul awal | Penawaran, Invoice, Pembayaran, dan Kwitansi |
| Pemilik produk | PT. Nafiga Technology System |
| Status | Living document — fase database aktif |
| Versi | 0.1 |
| Diperbarui | 13 September 2026 |
| Sumber kebenaran teknis | [CURRENT_STATE.md](./CURRENT_STATE.md) dan [ARCHITECTURE.md](./ARCHITECTURE.md) |

> **Prinsip dokumen ini:** PRD menyatakan _apa_ dan _mengapa_. Detail implementasi serta status nyata harus selalu dibaca dari `CURRENT_STATE.md`. Jangan mengubah alur bisnis inti tanpa memperbarui keduanya dalam commit yang sama.

---

## 1. Ringkasan Produk

**Nafiga DocFlow** adalah fondasi modul ERP untuk mengelola siklus dokumen komersial PT. Nafiga Technology System sebagai system integrator. Produk ini menghilangkan pengisian ulang data pada setiap dokumen, menghitung nilai serta status secara otomatis, dan menyediakan verifikasi dokumen publik melalui QR.

Alur inti yang sudah diputuskan dan **tidak boleh diubah tanpa keputusan produk eksplisit**:

```text
Master Klien → Penawaran → Invoice → Catat Pembayaran → Kwitansi otomatis
```

Konteks hubungan:

```text
1 Klien      → banyak Penawaran
1 Penawaran  → banyak Invoice (DP / progres / retensi / pelunasan)
1 Invoice    → banyak Pembayaran / Kwitansi (pembayaran sebagian diperbolehkan)
```

Invoice juga dapat dibuat langsung tanpa penawaran untuk repeat order. Kwitansi tidak memiliki draft dan bersifat final sejak terbit.

### 1.1 Masalah yang Diselesaikan

1. Data klien, alamat, NPWP, PIC, dan line item sering diinput ulang pada penawaran dan invoice.
2. Nomor dokumen, total, PPN, PPh, terbilang, dan sisa tagihan rawan salah hitung jika dikerjakan manual.
3. Termin proyek system integrator beragam (DP 50% → pelunasan 50%, DP 30% → pelunasan 70%, progres, retensi) dan harus tetap dapat ditagih serta dilacak secara konsisten.
4. Pihak klien membutuhkan cara memeriksa keaslian dokumen tanpa diberi akses internal.
5. Desain dokumen yang penuh blok warna gelap boros tinta ketika dicetak di printer kantor.

### 1.2 Hasil yang Diharapkan

- Admin keuangan dapat membuat dokumen tanpa melakukan perhitungan atau penyalinan data manual.
- Dokumen turunan selalu menyebutkan dokumen induk pada badan dokumen.
- Nilai dan status pembayaran mencerminkan catatan pembayaran/kwitansi aktual.
- Klien bisa memindai QR untuk melihat halaman validasi publik.
- Dokumen tetap profesional dan hemat tinta saat dicetak A4.

---

## 2. Pengguna dan Kebutuhan

| Persona | Tujuan utama | Kebutuhan produk |
| --- | --- | --- |
| Admin Keuangan | Menerbitkan dokumen, mencatat pembayaran, melacak piutang | Builder cepat, hitung otomatis, status yang tepercaya, pencarian dokumen |
| Sales / Account Manager | Menyiapkan dan mengirim penawaran | Data klien konsisten, template item, alur persetujuan jelas |
| Direktur / Approver | Menyetujui nilai penawaran dan memantau status | Ringkasan jelas, dokumen A4 rapi, jejak status |
| Klien / Auditor | Memastikan dokumen autentik | Halaman validasi publik, nomor, nilai, penerbit, hash, dan preview dokumen |
| Engineer / Agent berikutnya | Mengembangkan sistem secara aman | PRD, status aktual, aturan kerja, arsitektur, dan roadmap yang tidak ambigu |

---

## 3. Sasaran dan Non-Sasaran

### 3.1 Sasaran Fase Saat Ini

- Data komersial disimpan di MySQL melalui Prisma dan API server-side.
- Builder Penawaran dan Invoice berfungsi dengan preview A4 langsung.
- Pencatatan pembayaran menerbitkan kwitansi otomatis dalam satu transaksi server-side.
- QR validasi menunjuk halaman publik `/v/[token]` dengan token acak.
- Login tetap mock untuk demonstrasi alur aplikasi.

### 3.2 Non-Sasaran Fase Saat Ini

- **Bukan** sistem akuntansi lengkap atau buku besar.
- **Bukan** e-Faktur / integrasi pajak resmi.
- **Bukan** tanda tangan elektronik tersertifikasi PSrE.
- **Bukan** PDF server-side, email delivery, WhatsApp delivery, atau document storage immutable.
- **Bukan** sistem authorization multi-peran yang siap production; auth masih mock.
- **Bukan** database production maupun deployment Hostinger saat ini.

---

## 4. Aturan Bisnis yang Tidak Boleh Berubah

### 4.1 Master Klien

- Master Klien menjadi satu-satunya sumber data nama, alamat, kota, NPWP, PIC, telepon, dan email klien.
- Memilih satu klien pada builder harus mengisi detail tersebut pada preview tanpa input ulang.
- Builder harus memungkinkan penambahan klien inline agar flow dokumen tidak terputus.

### 4.2 Penawaran

| Aspek | Aturan |
| --- | --- |
| Status | `Draft` / `Terkirim` / `Disetujui` / `Ditolak` / `Kedaluwarsa` |
| Kedaluwarsa | Dihitung otomatis bila status masih Terkirim dan tanggal berlaku telah lewat |
| Invoice | Tombol/aksi Buat Invoice hanya aktif setelah Penawaran Disetujui |
| Penomoran | `NTS/QUO/YYYY/MM/NNN` |
| Finalisasi | Nomor, token, dan hash dibuat server-side saat dokumen diterbitkan |

### 4.3 Invoice

| Aspek | Aturan |
| --- | --- |
| Sumber | Dari Penawaran Disetujui atau dibuat langsung untuk repeat order |
| Carry-over | Invoice dari penawaran membawa klien dan item penawaran; nilai item diskalakan sesuai persentase termin |
| Termin | Satu penawaran dapat menerbitkan banyak termin — DP, progres, retensi, pelunasan, atau kustom |
| Penomoran turunan | `NTS/INV/YYYY/MM/<seq-penawaran>-T<nomor-termin>` |
| Penomoran langsung | `NTS/INV/YYYY/MM/NNN` |
| Status | `Terkirim` / `Terbayar Sebagian` / `Lunas` / `Jatuh Tempo` |
| Status manual | **Dilarang.** Status dihitung dari total kwitansi dibanding total invoice dan tanggal jatuh tempo |
| Referensi induk | Invoice dari penawaran wajib menampilkan nomor penawaran di badan dokumen |

### 4.4 Pembayaran dan Kwitansi

| Aspek | Aturan |
| --- | --- |
| Pembayaran parsial | Diperbolehkan selama tidak melebihi sisa tagihan |
| Kwitansi | Tercipta otomatis saat pembayaran dicatat; tidak ada draft |
| Finalisasi | Kwitansi final sejak terbit; nomor, token, hash tidak boleh diubah |
| Penomoran | `NTS/KWT/YYYY/MM/NNN` |
| Referensi induk | Kwitansi wajib menampilkan nomor invoice di badan dokumen |
| Status invoice | Perubahan status hanya mengikuti akumulasi kwitansi, tidak dapat dipilih admin |

### 4.5 Nilai dan Pajak

- Setiap angka yang dapat dihitung sistem tidak boleh ditulis manual oleh admin.
- Harga input memakai format ribuan Indonesia (`1000000` → `1.000.000`).
- Subtotal = jumlah dari `qty × harga satuan`.
- PPN default 11%, dapat diaktifkan/nonaktifkan per dokumen.
- PPh 23 default 2%, tercatat sebagai potongan pemberi kerja; nilai total dokumen mengikuti konfigurasi yang dipilih.
- Terbilang selalu dibuat otomatis dari total final dokumen.

### 4.6 Validasi dan Tanda Tangan

- Token validasi harus acak dan tidak berasal dari nomor dokumen yang bisa ditebak.
- QR harus mengarah ke `/v/[token]` pada origin aplikasi yang sedang dipakai.
- Halaman validasi publik wajib menampilkan valid/tidak ditemukan, jenis, nomor, tanggal, penerbit, klien, nilai, referensi induk bila ada, hash, serta preview.
- “Tanda tangan digital” untuk fase ini berarti **specimen tanda tangan + QR verifikasi + hash SHA-256**. Ini **bukan** tanda tangan elektronik tersertifikasi PSrE.

---

## 5. Kebutuhan Fungsional

### 5.1 Daftar Kebutuhan

| ID | Kebutuhan | Prioritas | Kriteria penerimaan |
| --- | --- | --- | --- |
| FR-01 | Kelola master klien | P0 | Admin dapat melihat, mencari, menambah, dan memakai klien pada builder |
| FR-02 | Builder Penawaran | P0 | Form 4 blok, preview A4 live, autosave draft lokal, item CRUD/reorder/template, pajak & terbilang otomatis |
| FR-03 | Status Penawaran | P0 | Admin dapat memindah Draft → Terkirim → Disetujui/Ditolak; expired dihitung otomatis |
| FR-04 | Invoice dari Penawaran | P0 | Hanya dari penawaran Disetujui; klien/item terbawa dan referensi induk tercetak |
| FR-05 | Invoice langsung | P0 | Admin dapat membuat invoice repeat order tanpa penawaran |
| FR-06 | Multi-termin | P0 | Banyak invoice dapat ditautkan ke satu penawaran dengan persentase dan label termin |
| FR-07 | Pembayaran → Kwitansi | P0 | Satu aksi catat pembayaran menciptakan payment dan kwitansi final secara atomik |
| FR-08 | Status Invoice otomatis | P0 | Sistem menghitung status dari total kwitansi dan due date; tidak ada kontrol status manual |
| FR-09 | Dokumentasi A4 | P0 | Ketiga dokumen menggunakan keluarga komponen yang sama dan dapat dicetak via browser A4 |
| FR-10 | Validasi publik | P0 | QR/token menunjukkan status valid atau tidak ditemukan tanpa memerlukan login |
| FR-11 | Persistensi MySQL | P0 | Dokumen terbit, pembayaran, template, dan pengaturan dipersist melalui Prisma/API |
| FR-12 | Reset data demo | P1 | Environment development dapat direset ke seed dengan aksi eksplisit |
| FR-13 | Sisa pelunasan otomatis | P1 | Builder menyarankan `100% - termin yang sudah diterbitkan`, memblokir total termin >100% |
| FR-14 | Auth nyata & RBAC | P0 sebelum production | User login server-side, password hash, session aman, hak akses per peran |
| FR-15 | PDF server-side & arsip | P1 | PDF konsisten di server disimpan dengan version/hash dan siap dikirim email/WA |

### 5.2 Builder Dokumen — Spesifikasi UI

Builder wajib memiliki split-screen pada desktop:

1. **Kiri** — form yang dapat di-scroll: Klien → Detail → Rincian Item → Pajak & Termin.
2. **Kanan** — preview A4 yang berubah saat field diubah.
3. Header builder menampilkan status autosave draft dan aksi Batal/Terbitkan.
4. Pada mobile, form dan preview boleh disusun vertikal tanpa menghilangkan fungsi.

### 5.3 Dokumen Hemat Tinta

| Elemen | Standar visual |
| --- | --- |
| Warna brand | Hanya garis tipis, label kecil, dan teks; bukan blok latar luas |
| Header tabel | `#f4f7fa` + border bawah tegas; saat print latar jadi putih |
| Status | Badge outline, bukan fill gelap |
| Total/Terbilang | Latar `#f4f7fa` + border kiri orange; saat print latar mati, border bertahan |
| Print | `@page A4`, sidebar/action disembunyikan, hanya `.print-area` terlihat |

---

## 6. Kebutuhan Non-Fungsional

| Area | Kebutuhan |
| --- | --- |
| Keamanan | Kredensial hanya di env; API write wajib mendapat autentikasi sebelum production; token validasi tidak boleh sequential |
| Integritas | Nomor/token/hash dihitung server-side; payment dan receipt dibuat dalam satu transaksi database |
| Kinerja | Berorientasi aplikasi internal bertrafik ringan; tidak memerlukan server spek tinggi; hindari beban PDF/Puppeteer pada fase sekarang |
| Keterbacaan | Light-mode workspace, layout angka tabular, bahasa Indonesia, mobile responsive |
| Auditabilitas | Tahap production harus memiliki immutable document version, user/action/time audit log |
| Maintainability | Semua perubahan mengikuti `docs/WORKFLOW.md`; PRD, current state, progress log diperbarui bersama perubahan perilaku |
| Backup | Production harus memakai backup MySQL terjadwal sebelum data pelanggan nyata masuk |

---

## 7. Data Domain Ringkas

```text
Client 1 ── * Quotation 1 ── * Invoice 1 ── * Payment 1 ── 1 Receipt
  │                            │
  └────────────────────────────┴── clientId pada dokumen
```

Entitas utama:

| Entitas | Data penting |
| --- | --- |
| Client | Identitas perusahaan, alamat, NPWP, PIC |
| Quotation | Nomor, status, validity, item JSON, tax, token, hash |
| Invoice | Sumber/termin opsional, due date, item JSON, tax, token, hash |
| Payment | Invoice, tanggal, amount, method, note |
| Receipt | Payment, invoice, klien, nomor final, amount, token, hash |
| ItemTemplate | Nama dan kumpulan line item reusable |
| CompanySettings | Profil penerbit, bank, penandatangan, default pajak/catatan |

Lihat diagram visual: [docflow-architecture.svg](./assets/docflow-architecture.svg) atau [preview PNG](./assets/docflow-architecture.png).

---

## 8. Roadmap Produk

### Fase 0 — Foundation Mockup ✅

- UI dashboard, builder, keluarga dokumen, QR validation, status kalkulatif, print A4.

### Fase 1 — Database & Server API ✅ (development)

- MySQL + Prisma, API server-side, autoseed, data terbit/pembayaran tersimpan, reset demo.

### Fase 2 — Production Readiness 🔴 Wajib sebelum go-live

1. Auth nyata: user, password hash, reset password, session/server middleware.
2. RBAC: minimal Sales, Finance, Approver/Direktur, Administrator.
3. Authorization di seluruh API write; endpoint reset demo nonaktif di production.
4. Pisahkan validasi publik dari bootstrap internal: endpoint token-scoped hanya boleh mengembalikan satu snapshot dokumen aman.
5. Input validation server-side (Zod/ekuivalen), error handling, rate limiting token validation.
6. Prisma migrations terverifikasi — jangan bergantung pada `db push` di production.
7. Observability, audit log, backup/restore database, environment deployment Hostinger.

### Fase 3 — Keandalan Dokumen 🟠 Setelah production readiness

1. Dokumen snapshot/versi immutable saat terbit.
2. Sisa pelunasan otomatis dan validasi total termin ≤100%.
3. PDF server-side + arsip object storage.
4. Kirim email/WhatsApp dokumen dan reminder jatuh tempo.
5. Approval flow, revision/void/reissue dengan jejak audit.

### Fase 4 — ERP Growth 🟡

1. Purchase Order, delivery/BAST, kontrak, project milestone.
2. Integrasi akuntansi, pajak/e-Faktur, bank reconciliation.
3. Dashboard manajemen, aging receivable, laporan margin/project.
4. Integrasi PSrE (Privy/Peruri) bila kekuatan hukum tanda tangan elektronik diperlukan.

---

## 9. Metrik Keberhasilan

| Metrik | Target awal |
| --- | --- |
| Waktu membuat penawaran standar | < 5 menit dari klien & template yang sudah ada |
| Field diinput ulang pada invoice turunan | 0 field klien / 0 item sumber |
| Kesalahan hitung total/pajak/terbilang | 0 dari perhitungan aplikasi |
| Invoice berstatus tidak sesuai pembayaran | 0 (status selalu kalkulatif) |
| QR validasi dapat dibuka | ≥99% pada aplikasi tersedia |
| Dokumen lolos print kantor | 100% untuk layout A4 satu halaman sesuai jenis dokumen |

---

## 10. Keputusan Produk Tercatat

| Tanggal | Keputusan | Alasan |
| --- | --- | --- |
| 2026-09-13 | Nama repository: `nafiga-docflow` | Spesifik sebagai produk/modul; `nafiga-management` terlalu generik |
| 2026-09-13 | Login: panel brand navy + form terang lembut | Balanced, profesional, tidak silau; full-dark dan full-light ditolak |
| 2026-09-13 | MySQL + Prisma dipakai sejak fase 1 | Bentuk data siap ERP, data terbit perlu persistensi server-side |
| 2026-09-13 | Tanda tangan visual bukan PSrE | Hindari klaim legal yang keliru sampai integrasi terpisah dilakukan |
| 2026-09-13 | Auth server-side (scrypt + session HttpOnly) menggantikan mock | Wajib sebelum data nyata; API write kini terlindungi |
| 2026-09-13 | Validasi publik token-scoped, terpisah dari bootstrap | Mencegah kebocoran arsip global lewat halaman QR |
| 2026-09-13 | Aksi finansial fail-closed saat server tak terjangkau | Dokumen tidak boleh "terbit" hanya di browser |
| 2026-09-28 | Snapshot immutable di kunci saat terbit (issuer/client/totals) | Dokumen historis tidak boleh berubah oleh edit master |
| 2026-09-28 | Penomoran via tabel counter (FOR UPDATE) + nomor termin dari identitas penawaran | Aman multi-user, tanpa collision lintas bulan |
| 2026-09-28 | RBAC: admin/finance/sales/viewer dengan permission per-fitur | Pemisahan tugas dasar untuk operasi tim kecil |

---

## 11. Referensi Internal

- [Architecture](./ARCHITECTURE.md)
- [Current State](./CURRENT_STATE.md)
- [Workflow & Agent Rules](./WORKFLOW.md)
- [Progress Log](./PROGRESS_LOG.md)
- [Diagram Arsitektur](./assets/docflow-architecture.svg)
