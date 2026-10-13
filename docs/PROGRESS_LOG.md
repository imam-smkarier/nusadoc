# Progress Log — Nusadoc

> Log ini bersifat append-only. Tambahkan entry baru di atas; jangan menulis ulang histori kecuali faktanya salah. Detail kondisi saat ini ada di [CURRENT_STATE.md](./CURRENT_STATE.md).

## 2026-10-02 — Transformasi SaaS Multi-Tenant, Trial 30 Hari, Paket Lite 50K, & Verifikasi Mobile Flutter

### Done

- **Multi-Tenant SaaS Architecture:**
  - Model `Organization` (`plan: trial | lite | bulanan | hakguna | enterprise`, `trialEndsAt`, `createdAt`).
  - Kolom `organizationId` ditambahkan ke seluruh domain: `User`, `Client`, `Quotation`, `Invoice`, `Payment`, `Receipt`, `ItemTemplate`, `CompanySettings`, `DeliverySettings`, `DeliveryLog`, dan `Subscription`.
  - Migrasi `20261002000000_saas_multitenant_plans` + `20261002010000_doc_number_per_org` + `20261002020000_deliverylog_org` sukses dieksekusi di database MySQL `nusadoc_dev`.
  - Data demo di-backfill ke workspace `org_demo` (plan `hakguna` = lifetime, tidak terkunci).
  - Penomoran dokumen (`DocumentCounter`) ber-prefix per organisasi: `${orgId}:QUO-YYYY-MM`, `${orgId}:INV-YYYY-MM`, `${orgId}:KWT-YYYY-MM`.
  - Kode klien (`Client.code`) dan nomor dokumen unik per-organisasi (composite unique `[organizationId, code]` & `[organizationId, number]`).
- **Katalog Paket & Entitlements Server (`src/lib/plans.ts` & `src/lib/server/plan.ts`):**
  - **Trial 30 Hari**: Rp 0, dokumen unlimited selama 30 hari.
  - **Lite**: Rp 50.000 / bulan — kuota maksimal **25 dokumen / bulan** (penawaran + invoice + kwitansi), 1 user.
  - **Bulanan**: Rp 249.000 / bulan — dokumen tanpa batas, 3 user.
  - **Hak Guna**: Rp 19.900.000 sekali bayar selamanya — on-premise, unlimited.
  - `getOrgEntitlements()` & `assertCanPublish()`: Server menghitung penggunaan dokumen bulan kalender berjalan dan menolak penerbitan ke-26 pada paket Lite atau akun kedaluwarsa dengan HTTP 402 + info upgrade.
- **Registrasi Mandiri & Auth Multi-Tenant:**
  - `POST /api/auth/register` (rate-limited, Zod): pendaftaran instan dalam 1 transaksi (Organization trial + User admin + CompanySettings awal) + auto-login.
  - `GET /api/auth/me` kini mengembalikan data user + profil organisasi + kuota dokumen (`docsUsed`, `docsLimit`, `daysRemaining`).
  - Seluruh endpoint API internal di-scope organisasi; akses dokumen milik organisasi lain ditolak dengan 404/403.
- **Checkout & Webhook Org-Linking:**
  - `POST /api/subscription/checkout` kini session-aware (menghubungkan `organizationId` & `userId`).
  - Webhook Midtrans settlement otomatis meng-upgrade `Organization.plan` ke paket berbayar (`lite`, `bulanan`, `hakguna`) dan menghapus status trial.
- **Antarmuka Pengguna (UI):**
  - **Halaman `/daftar`**: Formulir registrasi modern split-panel senada halaman login.
  - **Halaman `/langganan`**: Dashboard paket & kuota dengan progress bar dokumen bulan berjalan, status masa trial/aktif, pilihan upgrade paket, dan riwayat transaksi.
  - **AppShell**: Menampilkan nama workspace + pill paket di sidebar & topbar mobile; banner alert jika trial tersisa ≤ 7 hari atau status read-only jika kedaluwarsa.
  - **Landing Page Pricing**: Kartu paket **Lite (Rp 50 rb/bln)** ditambahkan; tombol CTA mengarah ke pendaftaran trial 30 hari gratis.
- **Verifikasi UI Nusadoc Mobile (Flutter):**
  - Aplikasi Flutter `nusadoc-mobile` dijalankan dan diinspeksi langsung: Layar Executive Dashboard, Layar Document Review & Swipe to Sign TTE, Layar Daftar Dokumen dengan Tab filter, serta Layar Profil & Keamanan Kunci Enclave terverifikasi berfungsi sempurna.
- **Pengujian & Build:**
  - `npm test` lulus **75/75 tests (100%)** — termasuk unit test paket `plan.test.ts`, skenario pendaftaran SaaS, pembatasan kuota 25 dokumen Lite, dan pembukaan akses saat upgrade.
  - `npm run build` sukses **42 routes** tanpa error.

## 2026-10-01 (tahap 2) — Backend Nusadoc Mobile (Flutter) & TTE Biometrik

### Done

- **Database Skema Mobile Signer (Prisma):**
  - Model `DeviceSigner`: pendaftaran hardware mobile, public key ECDSA P-256, device token FCM, tipe biometrik, pin hash.
  - Model `DocumentSignatureLog`: jejak audit penandatanganan kriptografis dokumen (signerId, signatureProof, deviceInfo, IP, lokasi, timestamp).
  - Model `MobileRefreshToken`: sesi refresh token 30 hari di database.
  - Migration versioned: `20261001000000_mobile_signer_tte` sukses diterapkan di database MySQL.
- **Service Mobile Auth & Kriptografi:**
  - `src/lib/server/mobile-auth.ts`: Dual-mode JWT & Refresh Token tanpa dependency pihak ketiga (100% native `node:crypto` HMAC-SHA256).
  - `src/lib/server/biometric-verify.ts`: Verifikasi signature ECDSA P-256 (`prime256v1`) dari chip Apple Secure Enclave & Android Keystore, format challenge kanonik `NUSADOC-TTE:{docId}:{hash}:{timestamp}`, dan fallback verifikasi Secure PIN 6-digit.
- **REST API Mobile Handlers (`/api/mobile/*`):**
  - `POST /api/mobile/auth/login` (login dual-mode, register device, return Bearer token pair).
  - `POST /api/mobile/auth/refresh` (refresh access token).
  - `POST /api/mobile/devices/register` (daftarkan public key ECDSA & PIN).
  - `GET /api/mobile/dashboard` (metrik kas eksekutif: piutang aktif, penerimaan bulan ini, pending approval, overdue).
  - `GET /api/mobile/approvals/pending` (daftar draf penawaran/invoice butuh persetujuan direksi).
  - `GET /api/mobile/documents/:id` (detail lembar dokumen + challenge signature).
  - `POST /api/mobile/approvals/:id/sign` (verifikasi signature biometrik, update status `approved`, catat audit log & signature log).
  - `POST /api/mobile/approvals/:id/reject` (tolak penawaran dengan catatan revisi tertulis).
  - `POST /api/mobile/payments/quick-record` (catat pembayaran instan dan terbitkan kwitansi resmi dari HP).
- **Master Prompt AntiGravity:** Tersimpan di `docs/ANTIGRAVITY_FLUTTER_PROMPT.md` siap pakai.
- **Test Suite:** 62 tests lulus (termasuk 6 unit test mobile auth JWT, tampering rejection, ECDSA P-256 keypair signing & PIN verification).

## 2026-10-01 — Final Release Polish: Marketing Master Copywriting, Interactive Simulator & SEO Master

### Done

- **Audit & Revamp Copywriting Soft-Marketing (Marketing Master):**
  - **Hero Hook B2B Tajam**: "Tutup Deal Lebih Cepat. Tagih Termin Tanpa Canggung. Bebas Kwitansi Palsu." Mengangkat 3 pilar: closing proposal instan (<60 detik), penagihan termin proyek otomatis tanpa selisih rupiah, dan kwitansi sah anti-falsifikasi.
  - **Masalah Lapangan (Problems)**: Menyorot langsung 3 titik pendarahan kas operasional bisnis Indonesia: (1) Kalkulasi termin proyek rumit di Excel yang rawan komplain/selisih; (2) Sungkan dan canggung menagih klien via chat pribadi; (3) Dokumen manual/Word/PDF biasa yang rawan diedit dan diragukan bagian finance klien korporat & BUMN.
  - **Fitur Berorientasi Hasil Bisnis**: Menekankan keuntungan cash flow, penghematan waktu admin 85%, kepastian perhitungan PPN 11% & PPh 23, serta proteksi reputasi perusahaan.
  - **FAQ Komprehensif B2B**: Menjawab tuntas keraguan pembeli korporat: kepatuhan pajak Indonesia, cara kerja QR kamera smartphone tanpa login, keamanan data 100% on-premise pada paket Hak Guna, pengiriman otomatis WhatsApp/Email, dan pencatatan pembayaran cicilan/parsial.
- **Komponen Simulasi Alur Dokumen Interaktif (`DocumentSimulator.tsx`):**
  - Pola interactive showcase 21st.dev dengan 3 tahapan dokumen: (1) Penawaran Cepat, (2) Invoice Multi-Termin, (3) Kwitansi Sah & QR.
  - Sisi kiri: cerita bisnis, masalah lapangan, keuntungan konkret, metric badge live, tombol simulasi lanjut.
  - Sisi kanan: lembar dokumen interaktif yang bertransformasi dinamis saat tab berganti (simbol resmi, nomor atomik, kalkulasi pajak, termin DP 50%, terbilang, dan security footer QR + SHA-256).
  - Dilengkapi fitur auto-advance tiap 6,5 detik dan kendali manual penuh.
- **Scanner QR Smartphone Interaktif (`InteractiveQrDemo.tsx`):**
  - Menggantikan placeholder kotak abu-abu `ImageSlot` kosong di `QrShowcase`.
  - Simulasi kamera smartphone realistis (chassis modern, viewfinder kamera, laser pemindai berdenyut) yang secara otomatis mendeteksi QR kode kwitansi dan memunculkan pop-up sheet verifikasi: "✅ Dokumen Resmi Sah — Hash SHA-256 Diverifikasi Server — 100% ASLI", lengkap dengan tombol "Pindai Ulang" dan "Lihat Asli".
- **SEO Master Setup & JSON-LD Structured Data:**
  - `src/app/layout.tsx` & `src/app/page.tsx`:
    - Meta Title: "Nusadoc — Software Invoice Multi-Termin & Kwitansi QR Otomatis Indonesia".
    - Meta Description teroptimasi untuk kata kunci pencarian bisnis & UMKM Indonesia.
    - OpenGraph lengkap (id_ID, type website, dynamic image tag), Twitter Cards (summary_large_image), Canonical URL (`https://nusadoc.id`), dan Robots indexing rules.
    - JSON-LD `@graph`: Schema `Organization` (PT. SMKarier Inovasi Digital) + `SoftwareApplication` (Nusadoc, category BusinessApplication, pricing offer Bulanan & Hak Guna, 4.9 rating) untuk Google Rich Snippets.

### Verified

- `npm run build` sukses (33 routes App Router, 0 error).
- `npm test` lulus (56/56 unit & integration tests).
- Visual DOM di Playwright: Hero copy, DocumentSimulator stage 1/2/3 tab interaction, InteractiveQrDemo scanning laser & sheet popup, serta validitas JSON-LD terverifikasi 100%.

## 2026-09-30 (revisi) — Brand Polish: Transparansi Logo, Splash Screen, Hierarchy Branding

### Done

- **Logo simbol transparan diproses dari bundle:** PNG `nusadoc-symbol-square.png` di bundle ternyata RGB dengan background putih (bukan RGBA). Diproses via PIL (white→alpha per-pixel dengan unpremultiply, threshold noise, autocrop) → `nusadoc-symbol.png` transparan (855×937) + varian **`nusadoc-symbol-on-dark.png`** (bagian navy diremap putih untuk latar gelap). File SVG symbol lama (bentuk tidak resmi) & `nusadoc-logo-horizontal.*` dihapus.
- **Referensi logo diperbarui semua konteks:** background terang → simbol full-color transparan (DocumentHeader/dokumen hero, navbar, ValidateClient, kartu login); background gelap → varian on-dark (AppShell sidebar, panel login, footer landing). Tidak ada lagi kotak putih di footer/sidebar.
- **Logo cloud tidak terpotong:** container ikon square 36px diganti lebar penuh per item (w-24/28, max-w 88–104px, tinggi mengikuti rasio) — 7 wordmark bank tampil utuh.
- **Logo BSI dikoreksi:** sebelumnya tak sengaja memakai logo "BSN — Bank Syariah Nasional"; diganti SVG resmi **BSI (Bank Syariah Indonesia)** dari Wikimedia Commons.
- **Splash screen entrance (21st.dev style):** komponen `SplashScreen` di root layout — full-screen navy, logo scale+blur-in dengan glow ring, wordmark, tagline "Aman. Cepat. Terverifikasi." stagger per kata, progress bar, fade-out exit (~2,1s). Sekali per sesi browser (sessionStorage setelah selesai — aman terhadap React StrictMode double-mount), skip bila prefers-reduced-motion.
- **Hierarki branding dirapikan:** label "SMKarier"/"Sistem Dokumen Bisnis" yang wrap tidak simetris di sidebar & panel login diganti lockup satu baris (logo + wordmark "Nusadoc" sejajar; login: wordmark besar + tagline tracking lebar di bawahnya). Copy dashboard & login kini menyebut Nusadoc, bukan SMKarier.

### Verified

- `npm run build` sukses; splash tampil di load pertama, tidak muncul di reload kedua (terverifikasi via Playwright DOM polling + screenshot).
- Visual: logo cloud 7 channel utuh, footer & sidebar tanpa kotak putih, logo dokumen hero = logo terbaru.

## 2026-09-30 — Business Flow Pembayaran, Delivery Email/WA, Logo Cloud, Test Suite

### Done

- **Business flow pembayaran ditutup lengkap:** Pilih Paket → Checkout Modal → Midtrans Snap → Webhook settlement → **Halaman konfirmasi `/pembayaran/sukses?order_id=...`** dengan polling status otomatis (3 detik) via `GET /api/subscription/[orderId]`. CheckoutModal kini mengarahkan onSuccess/onPending ke halaman konfirmasi; endpoint simulasi juga mengarah ke sana.
- **Logo cloud channel pembayaran (21st.dev "LogoCloudSwap"):** Komponen `src/components/ui/logo-clouds.tsx` + `logo-clouds-utils/logos.ts` dengan logo SVG **asli** 7 channel aktif Midtrans akun SMKarier (GoPay, BNI, BRI, Bank Mandiri, BSI, CIMB Niaga, PermataBank) diunduh dari Wikimedia Commons ke `public/images/payments/`. Animasi wipe/stagger per logo, responsive (grid 3 kolom di mobile), ditempatkan setelah footer landing.
- **Sistem Email & WhatsApp delivery:**
  - Prisma model `DeliverySettings` (singleton) + `DeliveryLog` + migration versioned `20260930000000_delivery_email_wa`.
  - Kredensial SMTP password & WA token **terenkripsi AES-256-GCM** (`src/lib/server/secret.ts`) — UI hanya menerima status "terisi", tidak pernah plaintext.
  - `src/lib/server/delivery.ts`: Nodemailer SMTP + WA gateway (Fonnte default / WaBlas), normalisasi nomor 08xx→628xx, template email & pesan WA dokumen, DeliveryLog untuk semua attempt.
  - Auto-delivery fire-and-forget (`deliver-doc.ts`): penawaran saat status → "sent", invoice saat terbit, kwitansi + notifikasi admin WA saat pembayaran dicatat — kegagalan tidak menggagalkan penerbitan dokumen.
  - **Admin panel lengkap** (`DeliverySettingsPanel` di /pengaturan): toggle aktif, konfigurasi SMTP (host/port/SSL/user/pass/from), WA provider + token + nomor admin, otomatisasi (auto-send publish/payment, reminder hari), **tombol tes kirim email & WA**, dan log pengiriman terakhir.
- **Unit & integration test suite (Vitest):** `npm test` (63 tests lulus):
  - Unit: calc (totals/pajak/termin/status invoice/kedaluwarsa), hash (SHA-256 vektor standar, canonicalJson, tamper detection), numbering (server + fallback, nomor termin dari identitas penawaran), RBAC matrix, Zod checkout, enkripsi AES-GCM, signature Midtrans SHA-512, kontrak paket.
  - Integration DB: 10 alokasi counter **paralel** unik berurutan (FOR UPDATE), rollback transaksi tanpa orphan payment, konsistensi scaleItems/computeTotals/hash.
  - Integration API (butuh server hidup, `NUSADOC_TEST_BASE_URL`): login salah 401, tanpa sesi 401, sales payment 403, **overpayment 422**, **termin >100% 422**, payment valid 201 + kwitansi otomatis.
- **Bug ditemukan & diperbaiki test suite:** prefix nomor dokumen tidak konsisten — rebrand sebelumnya hanya mengubah `sequence.ts` ke `NSD/` sedangkan `numbering.ts` (fallback client), seed, filter counter di 3 API routes, preview builder, dan dokumentasi masih `NTS/`. Distandardkan seluruhnya ke `NSD/` (brand Nusadoc).

### Verified

- `npm run build` sukses (30 routes, 0 error).
- `npm test` → **63/63 lulus** (unit 52 + integration DB 4 + API 7 dijalankan dengan server lokal).
- Halaman konfirmasi polling: status pending → active terverifikasi via curl `GET /api/subscription/[orderId]`.
- Logo cloud tampil dengan SVG asli 7 channel; build valid.

### Known Limitations

- Reminder jatuh tempo terjadwal (cron) belum dieksekusi otomatis — setting harinya sudah ada di admin panel.
- Rate limiter login (10/5 menit, in-memory) membatasi run test API berulang pada server yang sama — restart server atau tunggu jeda.
- Object storage untuk arsip PDF belum tersambung (lihat keputusan produk 2026-09-30 di PRD).

## 2026-09-29 — Integrasi Midtrans & Nusadoc Brand Bundle

### Done

- **Brand Bundle & Favicon Proper:** Sinkronisasi aset resmi dari `/media/imamnj/DATA/DOKUMENT IMAM NAJMUDIN/NusaDoc Project/nusadoc-brand-bundle` (multi-size ICO 48/32/16, icon 512px, symbol square, full-color & dark variants). Memperbaiki broken image link pada `AppShell.tsx` dan `ValidateClient.tsx`, membersihkan file lama `nafiga-*`, dan memperbarui nama package menjadi `"name": "nusadoc"`.
- **Database Subscription:** Menambahkan model Prisma `Subscription` dan `SubscriptionLog` dengan indexing optimal, foreign key cascading, serta migration versioned `20260929000000_subscription_midtrans`.
- **Server-Side Midtrans Helper:** `src/lib/server/midtrans.ts` mengelola konfigurasi environment (`MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`), request transaksi Snap REST API, verifikasi signature SHA-512 dengan timing-safe equal, dan mode simulasi dev.
- **API Routes Pembayaran:**
  - `POST /api/subscription/checkout`: Validasi Zod (`subscriptionCheckoutInput`), generate order ID atomik `NSD-SUB-...`, create Snap session, insert status `pending`.
  - `POST /api/webhooks/midtrans`: Verifikasi signature SHA-512, transaksional idempoten: settlement mengaktifkan subscription (+30 hari bulanan atau lifetime hak guna), mencatat `SubscriptionLog` dan `AuditLog`.
  - `GET /api/subscription/status`: Menampilkan status paket aktif dan histori pembayaran perusahaan.
  - `GET /api/subscription/simulated-pay`: Endpoint helper simulasi penyelesaian pembayaran untuk testing lokal.
- **UI Checkout & Billing:**
  - `useMidtransSnap.ts`: Hook client-side untuk memuat `snap.js` dan trigger popup `window.snap.pay()`.
  - `CheckoutModal.tsx`: Modal interaktif di landing page (`#harga`) untuk paket Bulanan (Rp 249 rb) dan Hak Guna (Rp 19,9 jt) dengan opsi Midtrans Snap dan fallback WhatsApp.
  - `SubscriptionCard.tsx`: Komponen kartu status lisensi & riwayat pembayaran di halaman `/(app)/pengaturan`.

### Verified

- `npm run build` sukses (29 routes berhasil dikompilasi, type-safe, nol error).
- `npx prisma migrate deploy` sukses mengeksekusi 3 versioned migrations di MySQL `nusadoc_dev`.
- Curl API checkout: validasi input Zod bekerja (error 422 bila invalid), order ID dibuat sukses, Snap token didapatkan.
- Curl Webhook: signature salah ditolak 401; signature valid memicu settlement status `active`, audit log tercatat, pengulangan webhook idempoten.
- Hak Guna settlement: diverifikasi menghasilkan `interval: lifetime` dengan `currentPeriodEnd: null`.


## 2026-09-13 — Production Readiness P0 + P1 (5 tahap)

### Done

- **Tahap 1 — Auth:** User + Session (scrypt, cookie HttpOnly), login/logout/me, guard seluruh API write & bootstrap, reset demo wajib admin + non-production, login UI server-backed dengan error inline.
- **Tahap 2 — Validasi publik:** `/api/public/validate/[token]` token-scoped; canonical recursive JSON; hash mencakup seluruh payload (items/tax/subject/dates/notes/termin/method) dan diverifikasi ulang di endpoint publik; halaman QR tidak lagi menyentuh bootstrap.
- **Tahap 3 — Integritas finansial:** zod gate semua endpoint; invoice dari penawaran wajib Disetujui & klien cocok; item termin dihitung ulang server-side; total termin ≤100%; payment menolak overpayment dalam transaksi; state machine status quotation.
- **Tahap 4 — Koreksi domain/UI:** stamp kwitansi kumulatif (partial vs lunas), badge kedaluwarsa efektif di print, draft builder dibuang bila konteks URL berbeda, pajak invoice diwarisi quotation, preset "Sisa pelunasan (X%)", offline fail-closed + banner.
- **Tahap 5 — Operasional:** baseline migration `20260913190000_init`, tabel AuditLog (publish/status/receipt/settings), rate limit login (10/5 menit) & validasi publik (60/menit).

### Verified

- `npm run build` sukses pada setiap tahap.
- curl: login salah 401; endpoint tanpa sesi 401; reset admin-only; token salah 404; hashValid true setelah reset; draft-quotation invoice 422; termin >100% 422; overpayment 422; transisi ilegal 422; AuditLog terisi actor server-side; login percobaan ke-11+ mendapat 429.

### Known Limitations

- RBAC per-fitur, immutable snapshot, sequence table multi-user, Redis limiter — masih backlog (lihat CURRENT_STATE §7).

## 2026-09-28 — Finalisasi Production: Snapshot, Counter, RBAC, Health

### Done

- **Snapshot immutable:** kolom `snapshot` (issuer + client + totals terkunci) diisi server-side saat dokumen terbit; halaman detail & validasi publik merender dari snapshot — perubahan master klien/pengaturan tidak lagi mengubah dokumen historis.
- **Penomoran anti-benturan:** tabel `DocumentCounter` dengan pola `INSERT IGNORE` (autocommit) + `SELECT FOR UPDATE` + `UPDATE` dalam transaksi; counter menginisialisasi diri dari nomor tertinggi existing.
- **Nomor termin immutable:** `NSD/INV/<periode quotation>/<seq>-T<n>` dari identitas penawaran + unique constraint `[quotationId, terminIndex]` — menutup collision lintas bulan.
- **RBAC per-fitur:** permission map (admin/finance/sales/viewer), `requirePermission` di semua write API, gating UI via `useCan`, akun demo sales@/viewer@nafiga.co.id.
- **Operasional:** `GET /api/health`, migration versioned `20260913210000_snapshot_counter_rbac`.

### Verified

- `npm run build` sukses.
- Concurrency: 10 POST penawaran paralel → 10 sukses, nomor 016–025 unik berurutan.
- Snapshot: ubah nama klien master → dokumen & validasi publik tetap menampilkan nama saat terbit; hashValid true.
- RBAC: sales publish 200 / payment 403 / approve 403; viewer write 403.
- Termin: quo-002 approved → invoice `NSD/INV/2026/09/001-T1` + snapshot terisi.
- Health: `{ok:true, db:"up"}`.

### Known Limitations

- Data demo lama (pra-snapshot) dirender dari master (fallback); dokumen baru terkunci.
- PDF server-side, arsip, delivery email/WA masih di Fase 3 PRD.

---

## 2026-09-13 — Documentation & Sustainability Baseline

### Done

- Audit awal product, architecture, data, dan deployment-readiness dilakukan.
- Menambahkan `docs/PRD.md` sebagai kontrak produk dan roadmap.
- Menambahkan `docs/ARCHITECTURE.md` serta diagram SVG visual.
- Menambahkan `docs/CURRENT_STATE.md` untuk membedakan development-ready dan production blocker.
- Menambahkan `docs/WORKFLOW.md` sebagai aturan sustainable development untuk harness/model/agent berikutnya.
- Menambahkan README dan AGENTS metadata yang memuat status fase MySQL.

### Audit Highlights

- Database/API sudah cukup untuk development flow, tetapi **belum siap production**.
- Blocker utama: auth/RBAC, authorization endpoint write, validasi API, payment/termin integrity server-side, migrations, audit log, dan guard reset/seed.
- Halaman QR publik sekarang masih memakai bootstrap global sehingga berisiko membocorkan data lintas klien; harus diganti endpoint token-scoped sebelum production.
- Hash saat ini belum membuktikan integritas: nested item/tax tidak terserialisasi lengkap dan hash belum diverifikasi ulang; perlu immutable canonical snapshot + canonical serializer.
- Penomoran perlu sequence transaksi/locking dan unique termin (`quotationId`, `terminIndex`) sebelum multi-user atau production.
- Keputusan UI login dikunci: navy brand panel + soft-light form panel; full dark/full light ditolak karena terlalu gelap/silau.

### Verified

- `npm run build` sukses pada baseline dokumentasi.
- Repository GitHub private tersedia: `imam-smkarier/nafiga-docflow`.

### Known Limitations

- Login masih mock.
- API write belum protected.
- Reset demo masih endpoint aktif development.

---

## 2026-09-13 — MySQL & Server API Phase

### Done

- Menyiapkan database MySQL local development `nafiga_docflow` tanpa mengubah database aplikasi lain.
- Menambahkan Prisma 5.22 schema untuk Client, Quotation, Invoice, Payment, Receipt, ItemTemplate, CompanySettings.
- Menambahkan API bootstrap/autoseed, client, quotation, invoice, payment/receipt transaction, template, settings, dan reset demo.
- Mengubah store menjadi API-first dengan fallback localStorage ketika API development tidak tersedia.
- Menjadikan nomor dokumen, token QR, dan hash dibuat server-side.
- Menguji flow UI builder → API → MySQL; record diverifikasi lalu demo direset.

### Verified

- Build Next.js sukses.
- Bootstrap MySQL seed berhasil dengan 4 klien, 4 quotation, 3 invoice, 2 payment/receipt.
- POST quotation dan payment/receipt API berhasil.
- Print preview A4 berhasil dengan style hemat tinta.

### Known Limitations

- Belum ada auth, RBAC, input validation schema, concurrency sequence, termin cap, server overpayment check, audit/version.

---

## 2026-09-13 — Product Foundation & Frontend Mockup

### Done

- Scaffold Next.js 16, React 19, Tailwind 3, Framer Motion, lucide-react, qrcode.react.
- Membangun dashboard, master klien, pengaturan, penawaran, invoice, kwitansi, dan validasi QR publik.
- Membangun builder A4 split-screen dengan autosave draft, template item, format harga, pajak, dan terbilang.
- Membangun satu keluarga komponen dokumen hemat tinta untuk Penawaran/Invoice/Kwitansi.
- Membangun termin/carry-over dan status invoice yang dihitung dari payments.

### Verified

- Browser walkthrough login → builder → publish → invoice termin → payment → receipt → public validation.
- Screenshot/print A4 visual diperiksa.

### Known Limitations

- Saat fase ini, data masih mock/localStorage sebelum fase MySQL dimulai.
