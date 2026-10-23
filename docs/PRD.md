# Product Requirements Document (PRD) — NusaDoc

| Properti | Nilai |
| --- | --- |
| Produk | NusaDoc |
| Kategori | SaaS B2B multi-tenant — kendali arus kas proyek |
| Pemilik produk | PT SMKarier Inovasi Digital |
| Status | Living document — development; belum production (lihat CURRENT_STATE) |
| Versi | 0.2 |
| Diperbarui | 13 Oktober 2026 |
| Sumber kebenaran teknis | [CURRENT_STATE.md](./CURRENT_STATE.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [AUDIT_PRODUK.md](./AUDIT_PRODUK.md) |

> **Prinsip dokumen ini:** PRD menyatakan _apa_ dan _mengapa_. Detail implementasi serta status nyata selalu dibaca dari `CURRENT_STATE.md`. Jangan mengubah alur bisnis inti tanpa memperbarui keduanya dalam commit yang sama.
>
> Asal-usul: NusaDoc adalah fork (akhir September 2026) dari Nafiga DocFlow, versi khusus PT Nafiga Technology System. Hubungan kedua produk dan rencana penyatuannya ada di [RENCANA_PORTING.md](./RENCANA_PORTING.md).

---

## 1. Ringkasan Produk

### 1.1 Visi

> **NusaDoc memastikan setiap penawaran yang disetujui berubah menjadi uang masuk — tepat nilai, tepat waktu, dan bisa dibuktikan.**

**Slogan:** *Dari penawaran sampai uang masuk.*

NusaDoc **bukan sekadar aplikasi pembuat dokumen**. Dokumen yang rapi hanyalah syarat minimum, dan Word, Excel, atau Paper.id pun bisa menghasilkannya. NusaDoc adalah **kendali arus kas proyek** untuk bisnis B2B Indonesia: kontraktor, system integrator, agensi, konsultan, dan vendor pengadaan. Pertanyaan yang dijawab NusaDoc: *"Uang proyek kita di mana, siapa yang harus ditagih, termin mana yang tertahan, dan berapa yang dipotong pajak?"*

NusaDoc **menang** di termin proyek, kepastian pajak, koreksi beraudit, verifikasi QR, dan penagihan. NusaDoc **tidak** bersaing di akuntansi (Jurnal/Mekari, Accurate, Kledo) maupun payment gateway (Paper.id). Data diekspor ke software akuntansi pelanggan. Analisis lengkap: [AUDIT_PRODUK.md](./AUDIT_PRODUK.md) §2 & §4.

Alur inti yang sudah diputuskan dan **tidak boleh diubah tanpa keputusan produk eksplisit**:

```text
Master Klien → Penawaran → Invoice → Catat Pembayaran → Kwitansi otomatis
```

Konteks hubungan:

```text
1 Workspace (Organization) → banyak User, Klien, dan dokumen — terisolasi dari workspace lain
1 Klien      → banyak Penawaran
1 Penawaran  → banyak Invoice (DP / progres / retensi / pelunasan)
1 Invoice    → banyak Pembayaran / Kwitansi (pembayaran sebagian diperbolehkan)
```

Invoice juga dapat dibuat langsung tanpa penawaran untuk repeat order. Kwitansi tidak memiliki draft dan bersifat final sejak terbit.

### 1.2 Masalah yang Diselesaikan

1. Termin proyek (DP 30% → progres → retensi → pelunasan) dihitung manual di Excel. Hasilnya selisih rupiah dari kontrak, termin terlewat, dan sulit menjawab "proyek ini sudah ditagih berapa".
2. Klien memotong PPh 23/22 atau memungut PPN saat membayar, sehingga piutang tidak pernah "lunas" di catatan dan rekonsiliasi jadi berantakan.
3. Data klien, alamat, NPWP, PIC, dan line item diinput ulang di setiap dokumen.
4. Koreksi dokumen (revisi harga, salah nominal) dilakukan dengan menimpa file, tanpa jejak.
5. Bagian AP klien korporat/instansi meragukan dokumen PDF/Word biasa dan tidak punya cara mengecek keasliannya.
6. Penagihan bergantung pada ingatan admin; tidak ada daftar "siapa harus ditagih hari ini".

### 1.3 Hasil yang Diharapkan

- **Rata-rata hari dari invoice terbit sampai lunas turun** (metrik utama, §9).
- Nilai termin selalu pas dengan kontrak dan pajak benar untuk transaksi proyek B2B.
- Dokumen turunan selalu menyebutkan dokumen induk; status pembayaran mengikuti catatan aktual.
- Klien bisa memindai QR untuk mengecek bahwa dokumen cocok dengan arsip penerbit.
- Setiap workspace hanya melihat datanya sendiri.

---

## 2. Pengguna dan Kebutuhan

| Persona | Tujuan utama | Kebutuhan produk |
| --- | --- | --- |
| Pemilik / Direktur bisnis proyek | Tahu posisi kas & piutang, menyetujui penawaran | Ringkasan piutang & termin, persetujuan dari HP, rata-rata hari tagih |
| Admin Keuangan | Menerbitkan invoice termin, mencatat pembayaran & potongan pajak, menagih | Hitung termin/pajak otomatis, pusat penagihan, ekspor untuk akuntan |
| Sales / Account Manager | Menyiapkan dan merevisi penawaran | Template, revisi cepat, kirim dari aplikasi |
| Klien / Bagian AP / Auditor | Memastikan dokumen autentik sebelum membayar | Halaman validasi publik tanpa login |
| Admin workspace (pembeli SaaS) | Mendaftar, mengatur tim & langganan | Trial tanpa kartu, paket jelas, billing mandiri |
| Engineer / Agent berikutnya | Mengembangkan sistem secara aman | PRD, status aktual, aturan kerja, arsitektur, roadmap yang tidak ambigu |

---

## 3. Sasaran dan Non-Sasaran

### 3.1 Sasaran Fase Saat Ini

- SaaS multi-tenant yang **aman menerima pembayaran**: isolasi tenant, kuota ditegakkan server, billing tidak bisa diakali (Tahap 0 di AUDIT_PRODUK).
- Klaim pemasaran sesuai kemampuan produk yang sebenarnya.
- Fitur "jangan kalah dari Word" dan "hitungan dipercaya finance" (porting dari DocFlow, lihat RENCANA_PORTING).

### 3.2 Non-Sasaran

- **Bukan** sistem akuntansi atau buku besar. Data diekspor ke software akuntansi.
- **Bukan** e-Faktur/Coretax. Invoice NusaDoc adalah invoice komersial, bukan Faktur Pajak.
- **Bukan** tanda tangan elektronik tersertifikasi PSrE dan bukan e-Meterai. QR + hash membuktikan kecocokan dengan arsip penerbit. Persetujuan mobile (biometrik/PIN perangkat terdaftar) adalah tanda tangan elektronik **tidak tersertifikasi** yang beraudit.
- **Bukan** payment gateway untuk invoice tenant (fase ini). Langganan NusaDoc sendiri dibayar via Midtrans.
- **Bukan** PDF server-side (fase ini). Dokumen dicetak lewat browser.

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
| Penomoran | `NSD/QUO/YYYY/MM/NNN` |
| Finalisasi | Nomor, token, dan hash dibuat server-side saat dokumen diterbitkan |

### 4.3 Invoice

| Aspek | Aturan |
| --- | --- |
| Sumber | Dari Penawaran Disetujui atau dibuat langsung untuk repeat order |
| Carry-over | Invoice dari penawaran membawa klien dan item penawaran; nilai item diskalakan sesuai persentase termin |
| Termin | Satu penawaran dapat menerbitkan banyak termin — DP, progres, retensi, pelunasan, atau kustom |
| Penomoran turunan | `NSD/INV/YYYY/MM/<seq-penawaran>-T<nomor-termin>` |
| Penomoran langsung | `NSD/INV/YYYY/MM/NNN` |
| Status | `Terkirim` / `Terbayar Sebagian` / `Lunas` / `Jatuh Tempo` |
| Status manual | **Dilarang.** Status dihitung dari total kwitansi dibanding total invoice dan tanggal jatuh tempo |
| Referensi induk | Invoice dari penawaran wajib menampilkan nomor penawaran di badan dokumen |

### 4.4 Pembayaran dan Kwitansi

| Aspek | Aturan |
| --- | --- |
| Pembayaran parsial | Diperbolehkan selama tidak melebihi sisa tagihan |
| Kwitansi | Tercipta otomatis saat pembayaran dicatat; tidak ada draft |
| Finalisasi | Kwitansi final sejak terbit; nomor, token, hash tidak boleh diubah |
| Penomoran | `NSD/KWT/YYYY/MM/NNN` |
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
- Persetujuan lewat aplikasi mobile (biometrik/PIN perangkat terdaftar, kunci ECDSA P-256) disebut **"persetujuan beraudit — tanda tangan elektronik tidak tersertifikasi"**. Tidak boleh disebut "TTE tersertifikasi", "setara meterai", atau "sah secara hukum" tanpa kualifikasi.
- Copy publik tidak boleh menyebut dokumen "tidak bisa dipalsukan", "100% asli", atau "sah". Yang benar: pemalsuan **terdeteksi** karena isi tidak cocok dengan arsip penerbit (lihat AUDIT_PRODUK §3D).
- Halaman validasi publik hanya boleh mengembalikan field yang memang tampil di dokumen (allowlist), tanpa data internal tenant.

### 4.7 Workspace, Paket, dan Kuota

- Setiap data domain milik tepat satu workspace (`organizationId`). Setiap query baca/tulis/hapus dan setiap referensi silang wajib dicek milik workspace yang sama.
- Paket dan batasnya didefinisikan di `src/lib/plans.ts`. Kuota dokumen ditegakkan server (HTTP 402), bukan oleh UI.
- Order langganan **selalu** milik workspace dari sesi admin yang membuatnya. Tidak ada pengikatan lewat email yang diketik pembeli.
- Aturan hitung kuota untuk revisi, duplikat, void, dan invoice pengganti: `OPEN`, menunggu keputusan (RENCANA_PORTING §3).

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
| FR-15 | PDF server-side & arsip | P2 | PDF konsisten di server disimpan dengan version/hash dan siap dikirim email/WA |
| FR-16 | Workspace multi-tenant & registrasi | P0 | Pendaftaran `/daftar` membuat workspace trial 30 hari; data antar-workspace tidak pernah terlihat atau berubah lintas tenant (diuji integration test) |
| FR-17 | Paket, kuota & langganan | P0 | Kuota Lite 25 dokumen/bulan ditolak 402 di server; checkout Midtrans hanya oleh admin yang login; aktivasi hanya lewat webhook bertanda tangan |
| FR-18 | Kirim dokumen email/WhatsApp | P1 | Kredensial per workspace terenkripsi; email menyebut penerbit tenant, bukan NusaDoc/SMKarier |
| FR-19 | Persetujuan mobile | P1 | Hanya peran berizin, perangkat aktif milik penanda tangan, mengikuti state machine yang sama dengan web, tercatat di log tanda tangan |
| FR-20 | Revisi, diskon, void & pengganti, potongan pajak saat bayar | P0 produk | Lihat RENCANA_PORTING Tahap 1–2 (acceptance mengikuti DocFlow §9–§12) |
| FR-21 | Pusat penagihan, ekspor Excel, riwayat aktivitas, metrik hari tagih | P1 | Lihat RENCANA_PORTING Tahap 3; semua per workspace |

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
| Keamanan | Kredensial hanya di env (production wajib `MOBILE_JWT_SECRET`, `DELIVERY_ENC_KEY`, kunci Midtrans); tidak ada password default di production; semua API write terautentikasi & ber-RBAC; token validasi tidak sequential; rate limit pada login (web & mobile), registrasi, dan validasi publik |
| Isolasi tenant | Setiap query memfilter `organizationId`; setiap endpoint baru wajib punya test integration lintas tenant |
| Integritas | Nomor/token/hash dihitung server-side; payment dan receipt dalam satu transaksi; batas kuota, termin, dan pembayaran dicek di dalam transaksi dengan lock |
| Kinerja | SaaS bertrafik ringan–sedang di hosting Node.js (Hostinger); hindari beban PDF/Puppeteer pada fase sekarang |
| Keterbacaan | Light-mode workspace, layout angka tabular, bahasa Indonesia, mobile responsive |
| Auditabilitas | Snapshot dokumen immutable; audit log user/action/time **per workspace** (`AuditLog.organizationId` — prasyarat riwayat aktivitas) |
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

Fase 0–1 (mockup, database & API) dan fondasi SaaS (multi-tenant, paket, Midtrans, delivery, API mobile) sudah dibangun di development. Roadmap berikutnya mengikuti [AUDIT_PRODUK.md](./AUDIT_PRODUK.md) §5, dengan rincian porting di [RENCANA_PORTING.md](./RENCANA_PORTING.md):

| Tahap | Tujuan | Isi utama |
| --- | --- | --- |
| 0 — Aman dijual 🔴 wajib sebelum iklan/go-live | Tidak ada celah billing/tenant, klaim jujur | Sisa celah keamanan (admin default, entitlement fail-closed, rate limit, race kuota/pembayaran), koreksi klaim pemasaran, backup |
| 1 — Jangan kalah dari Word | Gesekan harian hilang | Edit draft, revisi `-R{n}`, duplikat, diskon, No. PO, qty desimal, edit klien |
| 2 — Hitungan dipercaya finance | Angka lolos pemeriksaan finance klien | Termin pas rupiah, PPh 23 atas jasa, potongan pajak & biaya transfer saat bayar, void & pengganti, meterai, PPN 12% DPP nilai lain |
| 3 — Alasan membayar | Uang masuk lebih cepat | Kirim dari layar (email + WA aktif), pusat penagihan & pengingat terjadwal, posisi proyek, ekspor Excel, riwayat aktivitas, metrik hari tagih |
| 4 — Diferensiasi SaaS | Skala & paket premium | User management + batas user, paket instalasi Hak Guna, white-label per tenant, e-Meterai, link pembayaran, ekspor akuntansi/Coretax, PSrE bila dibutuhkan |

---

## 9. Metrik Keberhasilan

**Metrik utama: rata-rata hari dari invoice terbit sampai lunas**, per workspace, dibanding baseline 3 bulan pertama workspace tersebut.

| Metrik | Arti | Target awal |
| --- | --- | --- |
| **Rata-rata hari tagih** (invoice terbit → lunas) | Seberapa cepat uang pelanggan masuk | Turun dibanding baseline |
| % invoice lunas sebelum jatuh tempo | Disiplin penagihan | Naik setiap bulan |
| Piutang > 60 hari | Risiko macet | Turun |
| Selisih nilai termin vs kontrak | Kebenaran hitung | Rp0 |
| Kesalahan hitung total/pajak/terbilang | Kebenaran hitung | 0 |
| Invoice berstatus tidak sesuai pembayaran | Status kalkulatif | 0 |
| Aktivasi trial (invoice termin pertama ≤ 7 hari) | Nilai inti dirasakan | ≥ 40% |
| Konversi trial → berbayar | Kesehatan bisnis | Baseline, lalu naik |
| Insiden lintas tenant / aktivasi tanpa bayar | Keamanan | 0 |
| QR validasi dapat dibuka | Ketersediaan | ≥ 99% |

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
| 2026-09-29 | Pembayaran langganan via Midtrans (PT. SMKarier Inovasi Digital) | Mendukung checkout online otomatis (Bulanan & Hak Guna) dengan Snap & webhook signature SHA-512 |
| 2026-09-29 | Standarisasi brand asset resmi dari `nusadoc-brand-bundle` | Favicon proper multi-size ICO (48/32/16), 512px icon, full-color & dark variants, symbol square |
| 2026-09-30 | Prefix nomor dokumen distandardkan ke `NSD/` seluruh sistem (server, fallback client, seed, filter counter) | Konsistensi brand Nusadoc; rebrand sebelumnya hanya mengubah server, ditemukan oleh test suite |
| 2026-09-30 | PDF server-side TIDAK wajib object storage — cukup filesystem lokal server | Target deployment Hostinger Business (tanpa S3); browser print tetap jalan; PDF server-side opsional via @react-pdf/renderer (tanpa Chromium) |
| 2026-09-30 | Delivery email/SMTP & WA (Fonnte/WaBlas) dikonfigurasi dari admin panel, kredensial terenkripsi AES-256-GCM | Setup tanpa deploy ulang; kredensial tidak pernah keluar plaintext dari server |
| 2026-10-02 | Transformasi SaaS Multi-Tenant: tabel Organization, isolasi workspace penuh | Setiap perusahaan memiliki data klien, dokumen, dan pengaturan terisolasi mandiri |
| 2026-10-02 | Paket Lite Rp 50.000 / bulan dengan kuota 25 dokumen / bulan | Pilihan paling terjangkau bagi freelancer dan bisnis rintisan mikro |
| 2026-10-02 | Registrasi mandiri `/daftar` dengan masa trial gratis 30 hari tanpa kartu kredit | Mendorong akuisisi pengguna tanpa gesekan (PLG); akun expired menjadi read-only |
| 2026-10-02 | Nusadoc Mobile (Flutter) dengan TTE Biometrik (Face ID/Sidik Jari) via Secure Enclave | Persetujuan dokumen cepat dalam satu genggaman untuk direksi/pemilik bisnis |
| 2026-10-13 | Reposisi: "kendali arus kas proyek — dari penawaran sampai uang masuk"; metrik utama rata-rata hari tagih | Melawan Word/Excel/Paper.id di pembuatan dokumen = kalah; pembeda ada di termin proyek, pajak, koreksi beraudit, QR, penagihan (AUDIT_PRODUK §2, §4) |
| 2026-10-13 | Checkout langganan wajib login sebagai admin; order selalu milik workspace sesi | Pengikatan lewat email memungkinkan siapa pun mengubah paket workspace lain |
| 2026-10-13 | Pelunasan simulasi & signature webhook "simulated" hanya di development tanpa kunci Midtrans | Endpoint simulasi sebelumnya mengaktifkan paket berbayar tanpa bayar |
| 2026-10-13 | Reset data demo hanya untuk workspace demo | Reset sebelumnya menghapus data semua tenant |
| 2026-10-13 | Satu perangkat mobile hanya milik satu akun; `MOBILE_JWT_SECRET` wajib di production | Mencegah pengambilalihan perangkat TTE lintas tenant dan pemalsuan token |
| 2026-10-13 | Persetujuan mobile disebut "tanda tangan elektronik tidak tersertifikasi" | Konsisten dengan keputusan 2026-09-13 (bukan PSrE) |

---

## 11. Referensi Internal

- [Audit Produk](./AUDIT_PRODUK.md)
- [Rencana Porting & Strategi Dua Produk](./RENCANA_PORTING.md)
- [Architecture](./ARCHITECTURE.md)
- [Current State](./CURRENT_STATE.md)
- [Workflow & Agent Rules](./WORKFLOW.md)
- [Progress Log](./PROGRESS_LOG.md)
- [Diagram Arsitektur](./assets/docflow-architecture.svg)
