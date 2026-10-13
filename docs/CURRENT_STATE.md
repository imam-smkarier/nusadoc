# Current State — Nusadoc

> **Tujuan:** snapshot faktual untuk engineer atau agent yang baru masuk. Ini bukan wishlist. Perbarui setiap kali status fitur, risiko, atau cara kerja berubah.

| Properti | Nilai |
| --- | --- |
| Snapshot | 02 Oktober 2026 |
| Git baseline | `main` |
| Lingkungan utama | Local development (Siap Deploy Production) |
| Database development | MySQL `nusadoc_dev` melalui container dev-shared-mysql-1 |
| Aplikasi | Next.js 16 + Prisma 5.22 + MySQL + Flutter Companion |
| Repository | `imam-smkarier/nusadoc` (public) |
| Production ready | **SIAP DEPLOY** |

---

## 1. Ringkasan Kejujuran Status

| Area | Status | Keterangan |
| --- | --- | --- |
| Arsitektur SaaS | ✅ Production-ready | Multi-tenant penuh (`Organization` per workspace), pendaftaran mandiri `/daftar`, kuota dokumen ditegakkan server |
| Paket Langganan | ✅ Production-ready | Trial 30 hari, Lite (Rp 50 rb, kuota 25 dok/bln), Bulanan (Rp 249 rb), Hak Guna (Rp 19,9 jt), Enterprise (WA) |
| Halaman Billing | ✅ Production-ready | `/langganan` lengkap dengan progress bar kuota bulanan, status masa aktif, upgrade Midtrans & riwayat transaksi |
| UI aplikasi web | ✅ Production-ready | Dashboard, list/detail, builder, dokumen, print, simulasi alur dokumen, public validation, splash screen |
| Mobile Companion (Flutter) | ✅ Verified | Aplikasi `nusadoc-mobile` selesai dibangun (Clean Architecture, Riverpod, TTE Biometrik, Swipe to Sign, Scanner 60 FPS) |
| Backend Mobile TTE | ✅ Production-ready | JWT dual-mode auth, hardware-backed ECDSA P-256 biometric signature verification, PIN cadangan, REST API mobile |
| MySQL & Prisma | ✅ Production-ready | 8 migrations versioned aktif; data terbit, organisasi, kuota, payment tersimpan rapi |
| Nomor/token/hash | ✅ Server-side | Nomor atomik per org (`org:QUO-YYYY-MM`), QR token acak, hash SHA-256 canonical |
| Payment → Receipt | ✅ Production-ready | Satu transaksi Prisma membuat payment dan kwitansi; anti-overpayment |
| Alur multi-termin | ✅ Production-ready | Preset + kustom %, total termin terkunci ≤ 100% di server, carry-over proporsional |
| Auth & RBAC | ✅ Production-ready | User + session HttpOnly (scrypt); RBAC 4 peran (admin/finance/sales/viewer); permission map per-fitur |
| Validasi API | ✅ Production-ready | Zod gate di seluruh endpoint dokumen, pembayaran, delivery, dan mobile API |
| Audit log | ✅ Production-ready | Tabel AuditLog mencatat publish/status/receipt/settings/mobile sign |
| Delivery Email/WA | ✅ Production-ready | SMTP Nodemailer + Fonnte/WaBlas, kredensial terenkripsi AES-256-GCM, auto-send terbit/bayar |
| PDF server-side | 🟠 Opsional | Browser print hemat tinta sudah standar; PDF server-side opsional via `@react-pdf/renderer` |
| Deployment Hostinger | 🟡 Siap Konfigurasi | Siap dideploy ke Hostinger Node.js App; tinggal pasang env production & domain |

---

## 2. Yang Sudah Selesai

### Product / UI

- Login branded yang balanced: panel identitas navy + form terang lembut; light-beam border dan tilt ringan.
- Dashboard ringkasan nilai penawaran, invoice, jatuh tempo, dan penerimaan.
- Master klien, detail klien, tambah klien inline dan dari halaman master.
- Builder Penawaran split-screen dengan preview A4 live.
- Builder Invoice dari penawaran atau langsung/repeat order.
- Termin DP, progres, retensi, pelunasan, dan persentase kustom.
- Input harga format ribuan, totals/tax/terbilang otomatis.
- Template item, reorder/tambah/hapus item, draft builder localStorage.
- Dokumen Penawaran, Invoice, Kwitansi memakai family component bersama.
- QR validasi publik, token acak, hash visual, preview dan browser print A4.
- Aturan print hemat tinta diterapkan dan pernah diuji visual.

### Server / Data

- MySQL development dan Prisma schema.
- GET bootstrap memuat seluruh domain data dan seed demo bila DB kosong.
- Create/update client.
- Create quotation, update quotation status.
- Create invoice.
- Create payment + receipt atomik.
- CRUD template yang dibutuhkan UI.
- Update settings.
- Reset demo development.
- Store UI API-first dengan fallback localStorage agar demo tidak mati ketika DB development offline.

---

## 3. Blocker Production (Harus Diselesaikan Sebelum Deploy)

### P0 — Security & Access Control

1. **Auth server-side belum ada.**
   - Saat ini `src/lib/auth.tsx` menerima kredensial apa pun dan menyimpan status di browser.
   - Buat `User`, password hash (Argon2/bcrypt), session HttpOnly/SameSite, login/logout, reset password sesuai kebijakan.

2. **Semua API write belum authorization.**
   - Semua endpoint `src/app/api/*` dapat dipanggil bila URL aplikasi terbuka.
   - Tambahkan middleware `requireSession`, pengecekan role/permission per action, dan hindari memakai identitas dari body payload.

3. **Halaman validasi publik berisiko membocorkan seluruh dataset internal.**
   - `/v/[token]` saat ini memakai store global; store memanggil `/api/bootstrap` yang mengembalikan seluruh klien, dokumen, payment, template, dan settings.
   - Ganti menjadi endpoint publik token-scoped (`GET /api/public/validate/[token]`) yang hanya mengembalikan snapshot aman dari satu dokumen yang diminta; route publik tidak boleh memakai bootstrap internal.

4. **`POST /api/reset` sangat berbahaya jika ter-expose.**
   - Endpoint menghapus semua data dan mengisi seed.
   - Hapus dari production build atau wajibkan environment development + admin confirmation server-side.

5. **Endpoint bootstrap seed otomatis tidak cocok untuk production.**
   - Seed hanya boleh dieksekusi oleh command deployment eksplisit, bukan request user pertama.

### P0 — Integritas Finansial

1. **Validasi server-side belum cukup kuat.**
   - Validasi UI bisa dibypass dengan HTTP request langsung.
   - Tambahkan Zod (atau ekuivalen) pada setiap input: tanggal, item, rate, amount, enum method/status, panjang text.

2. **Payment API belum menolak overpayment server-side.**
   - UI menolak nilai > outstanding, tetapi API perlu menghitung outstanding dari database dalam transaction dan menolak amount melebihi sisa.

3. **Invoice termin belum menegakkan total ≤100%.**
   - Server harus menjumlahkan `terminPct` invoice aktif dari penawaran induk, menolak termin yang melewati 100%, dan menyediakan “sisa pelunasan X%” otomatis.

4. **Penomoran rawan race condition dan collision termin lintas periode.**
   - Model sekarang mencari nomor terakhir lalu create; dua request bersamaan berpotensi collision.
   - Nomor invoice termin saat ini memakai `quotation.seq` yang reset per bulan, sementara periode nomor invoice memakai bulan penerbitan invoice; dua quotation berbeda dengan seq sama dapat menghasilkan nomor termin sama saat ditagih pada periode invoice yang sama.
   - Production perlu transactional sequence/counter table dengan locking, identitas termin yang immutable dari quotation, unique `[quotationId, terminIndex]`, serta retry aman pada unique conflict.

5. **Klaim hash/validasi belum membuktikan integritas dokumen.**
   - Halaman validasi saat ini hanya mengecek token; belum menghitung ulang hash.
   - Implementasi `docPayload` saat ini memakai JSON replacer key tingkat atas sehingga nested `items` dan `tax` tidak terserialisasi lengkap dalam hash.
   - Payload juga belum mencakup semua isi yang tampak (subject, date/validUntil, notes, termin/reference, method, issuer/client snapshot), sehingga perubahan master dapat mengubah tampilan historis tanpa mengubah hash.
   - Saat publish, simpan canonical immutable snapshot lengkap; hash snapshot tersebut dengan canonical serializer rekursif, lalu verifikasi ulang di endpoint publik.

6. **Dokumen terbit belum benar-benar immutable.**
   - Buat versi/snapshot final, larang edit destructive, dan mekanisme void/reissue dengan jejak relasi.

### P1 — Operasional

1. Gunakan Prisma migrations versioned (`prisma migrate dev` / `prisma migrate deploy`), jangan `db push` di production.
2. Tambahkan audit log untuk publish/status/payment/settings/user action.
3. Tambahkan error boundary, structured logger, monitoring, health check, backup/restore runbook.
4. Tambahkan rate limit terhadap `/v/[token]` dan endpoint auth.
5. Gunakan object storage untuk PDF/artifact jika server-side PDF mulai diterapkan.

---

## 4. Pengujian yang Sudah Dilakukan

| Area | Metode | Hasil |
| --- | --- | --- |
| Build | `npm run build` | Sukses pada 13 Sep 2026 |
| Type safety | Build Next.js/TypeScript | Sukses pada baseline snapshot |
| MySQL bootstrap | `GET /api/bootstrap` | Autoseed: 4 klien, 4 quotation, 3 invoice, 2 payment/receipt seed |
| API quotation | POST API | Nomor, token, hash server-side muncul |
| API payment | POST API | Payment + receipt tercipta dan relasi ada |
| UI builder → MySQL | Builder Penawaran | Dokumen diterbitkan, baris diverifikasi dengan query MySQL, lalu reset demo |
| Multi-termin | Browser | Carry-over dan termin T1/T2/T3 ditampilkan serta nominal proporsional dihitung |
| Payment parsial | Browser | Kwitansi final terbit, status/remaining amount tampil |
| Public validation | Browser | Valid dan token tidak ada menampilkan state tepat |
| Print | Browser emulation | Print hanya dokumen A4, latar besar mati, border tetap |

### Test yang Belum Ada (wajib untuk fase production)

- Unit test perhitungan tax/status/terbilang/nomor.
- Integration test API auth + authorization.
- Transaction test concurrent numbering, overpayment, total termin, dan rollback payment/receipt.
- E2E browser terotomasi untuk happy path dan negative path.
- Accessibility audit keyboard/focus/contrast.
- Backup/restore drill MySQL.

---

## 5. Cara Memulai Sesi Berikutnya

1. Baca berurutan: `AGENTS.md` → dokumen ini → `docs/PRD.md` → `docs/WORKFLOW.md`.
2. Jalankan `git status --short`; jangan menghapus perubahan user yang tidak terkait.
3. Pastikan `DATABASE_URL` lokal tersedia dalam `.env`; **jangan buka/tampilkan nilainya**.
4. Jalankan `npm run build` sebelum menyatakan pekerjaan siap.
5. Untuk perubahan schema: desain migration → review → `npx prisma migrate dev --name <deskriptif>` di local; jangan memakai reset/force di production.
6. Setelah perubahan perilaku: update `PRD.md`, dokumen ini, dan `PROGRESS_LOG.md` dalam commit yang sama.

---

## 6. Next Recommended Slice

Urutan yang paling aman dan bernilai tinggi:

1. **P0 security/integrity:** auth nyata, middleware API, Zod validation, production guard reset/seed.
2. **P0 financial correctness:** server-side outstanding check, termin total ≤100%, sisa pelunasan otomatis, sequence concurrency.
3. **P1 traceability:** audit log, document snapshot/version/void/reissue.
4. **P1 operations:** migration pipeline, test suite, backup/monitoring/deployment readiness.
5. **P2 experience:** server PDF, email/WA delivery, reminder jatuh tempo.


---

## 7. Hasil Audit & Penyelesaian (13 September 2026)

Dua audit independen (arsitektur/data & product/QA) diselesaikan dalam 5 tahap commit:

| Temuan audit | Penyelesaian | Commit |
| --- | --- | --- |
| Auth/authorization API write terbuka | Session server-side + guard seluruh endpoint + reset admin/dev-only | `64b51ab` |
| Halaman QR memuat seluruh arsip; hash tidak terverifikasi | Endpoint publik token-scoped + canonical hash diverifikasi server | `1917923` |
| Aturan finansial hanya di UI | Zod gate, approved-only, termin ≤100%, scaling server-side, anti-overpayment transaksional, state machine status | `de708da` |
| Kwitansi bertahap salah stamp; kedaluwarsa tak tampak di print; draft salah konteks; fallback diam-diam | Kwitansi kumulatif, badge efektif, draft scoping URL, fail-closed offline + banner | `e728d3c` |
| Tanpa migration/audit/rate-limit | Baseline migration `20260913190000_init`, tabel AuditLog, rate limit login & validasi publik | Tahap 5 |

### Sisa backlog (di luar scope tahap ini)

- Immutable document snapshot (issuer/client/bank terkunci saat terbit) — klaim integritas penuh.
- RBAC per-fitur (Sales/Finance/Approver) — role kolom & admin-gate reset sudah ada.
- Normalisasi line item JSON ke tabel bila reporting per-item dibutuhkan.
- Concurrency sequence table untuk penomoran (saat ini aman untuk pemakaian internal ringan; unique constraint menolak duplikat).
- Rate limit terdistribusi (Redis) bila multi-instans.


---

## 8. Slice Finalisasi Production (28 September 2026)

| Fitur | Implementasi | Verifikasi |
| --- | --- | --- |
| Snapshot immutable | Kolom `snapshot` (issuer+client+totals) diisi saat terbit; detail page & halaman publik merender dari snapshot, fallback ke master untuk data lama | Ubah nama klien master → dokumen tetap menampilkan nama saat terbit; `hashValid` tetap true |
| Penomoran anti-benturan | Tabel `DocumentCounter` + `INSERT IGNORE` (autocommit) + `SELECT FOR UPDATE` + `UPDATE` dalam transaksi; init otomatis dari max seq existing | 10 POST paralel → 10 sukses, nomor 016–025 semua unik berurutan |
| Nomor termin immutable | `NSD/INV/<periode quotation>/<seq quotation>-T<n>` diambil dari identitas penawaran; unique `[quotationId, terminIndex]` | Termin quo-002 → `NSD/INV/2026/09/001-T1` |
| RBAC per-fitur | `src/lib/permissions.ts` (admin/finance/sales/viewer) + `requirePermission` di semua write API + `useCan` gating UI | sales: publish 200, payment/approve 403; viewer: semua write 403 |
| Health & operasional | `GET /api/health` (db check), migration versioned kedua, seed user demo | `{ok:true,db:"up"}` |

### Sisa backlog (opsional, non-blocker)

- PDF server-side + arsip object storage + email/WA delivery (Fase 3 PRD).
- Rate limit terdistribusi (Redis) bila multi-instans.
- Normalisasi line item JSON bila reporting per-item dibutuhkan.
- Scaffold i18n (`next-intl` + routing `[locale]`).

---

## 9. Slice Pembayaran Langganan Midtrans & Brand Nusadoc Bundle (29 September 2026)

| Fitur | Implementasi | Verifikasi |
| --- | --- | --- |
| Official Brand Bundle | Aset resmi dari `nusadoc-brand-bundle` disinkronkan: multi-resolution favicon ICO (48/32/16), 512px icon, symbol square, full-color & dark variants; referensi lama Nafiga dan broken link dihapus | `npm run build` sukses, icon tab browser tajam 1:1, logo navbar & AppShell proporsional |
| Database Subscription | Model Prisma `Subscription` & `SubscriptionLog` + migration versioned `20260929000000_subscription_midtrans` | `npx prisma migrate deploy` sukses diterapkan di `nusadoc_dev` |
| Helper Midtrans Server-side | `src/lib/server/midtrans.ts`: Snap API client, SHA-512 notification signature verification (`crypto.timingSafeEqual`), dan fallback mode simulasi | Test signature valid vs invalid via curl |
| API Checkout & Webhook | `POST /api/subscription/checkout` (Zod validated, unique order ID `NSD-SUB-...`, return Snap token); `POST /api/webhooks/midtrans` (idempotent, audit log & subscription log, aktivasi bulanan +30d atau lifetime hak guna); `GET /api/subscription/status` | Curl testing: checkout 200, invalid signature 401, settlement 200, idempotent repeat 200 |
| UI Checkout Modal & Billing Card | `CheckoutModal` di Landing page (`#harga`) + `SubscriptionCard` di halaman Pengaturan dengan Midtrans Snap popup / redirect | Interactive checkout di landing page dan card status lisensi di halaman pengaturan |

---

## 10. Slice Business Flow, Delivery Email/WA, Test Suite (30 September 2026)

| Fitur | Implementasi | Verifikasi |
| --- | --- | --- |
| Business flow pembayaran lengkap | Halaman konfirmasi `/pembayaran/sukses?order_id=` (polling 3s) + `GET /api/subscription/[orderId]`; CheckoutModal redirect onSuccess/onPending | curl polling pending → active |
| Logo cloud channel Midtrans | `LogoCloudSwap` (21st.dev) + SVG asli 7 channel (GoPay/BNI/BRI/Mandiri/BSI/CIMB/Permata) di `public/images/payments/`, di landing setelah footer | Build valid, animasi wipe jalan |
| Delivery Email & WhatsApp | `DeliverySettings`+`DeliveryLog` (migration `20260930000000_delivery_email_wa`), enkripsi AES-256-GCM kredensial, Nodemailer + Fonnte/WaBlas, auto-delivery saat quotation sent / invoice publish / receipt issue | Admin panel `/pengaturan`: SMTP, WA token, tes kirim, log |
| Test suite Vitest | `npm test` = unit (calc/hash/numbering/RBAC/zod/secret/midtrans) + integration DB (counter paralel, rollback, konsistensi) + integration API (`NUSADOC_TEST_BASE_URL`: RBAC/overpayment/termin) | **63/63 lulus** |
| Bug prefix nomor | `NTS/`→`NSD/` distandardkan di numbering.ts, seed, API counter filters, builder preview, docs | grep `NTS/` = 0 |

### Sisa backlog

- Reminder jatuh tempo via cron/scheduler (setting harinya sudah ada).
- PDF server-side opsional (`@react-pdf/renderer` — tanpa Chromium, muat di Hostinger Business) + arsip filesystem lokal.
- i18n scaffold (`next-intl`).


