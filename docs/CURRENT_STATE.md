# Current State — NusaDoc

> **Tujuan:** snapshot faktual untuk engineer atau agent yang baru masuk. Ini bukan wishlist. Perbarui setiap kali status fitur, risiko, atau cara kerja berubah.

| Properti | Nilai |
| --- | --- |
| Snapshot | 13 Oktober 2026 |
| Git | Branch `feat/saas-multitenant` (10 commit di atas `main` `2612f75`, semua lokal — belum di-push) + perbaikan audit 13 Okt yang **belum di-commit** |
| Lingkungan | Local development saja. Belum ada staging/production yang diverifikasi |
| Database development | MySQL `nusadoc_dev` di container `dev-shared-mysql-1`; 8 migration, `prisma migrate status`: up to date |
| Aplikasi | Next.js 16 + Prisma 5.22 + MySQL; companion Flutter di `/home/imamnj/nusadoc-mobile` (repo git lokal sejak 13 Okt, tanpa remote) |
| Repository | `imam-smkarier/nusadoc` — **PUBLIC** di GitHub |
| Production ready | **BELUM.** Tahap 0 di [AUDIT_PRODUK.md](./AUDIT_PRODUK.md) §5 harus selesai lebih dulu |

---

## 1. Ringkasan Kejujuran Status

Label: `VERIFIED-CODE` / `VERIFIED-LOCAL` (dijalankan langsung) / `OPEN`.

| Area | Status | Keterangan |
| --- | --- | --- |
| Build & test | ✅ `VERIFIED-LOCAL` | `npm run build` lulus (55 entri route); `npm test` **110/110** (13 file); `tsc --noEmit` bersih — 13 Okt 2026 |
| Isolasi tenant data dokumen | ✅ `VERIFIED-CODE` | Semua route CRUD memfilter `organizationId`, termasuk referensi silang |
| Isolasi tenant billing, reset, perangkat mobile | ✅ diperbaiki 13 Okt (belum di-commit) | K1, K2, T1, T1b, T3, T4 — lihat §11 dan AUDIT_PRODUK §3A |
| Paket & kuota | 🟡 | Kuota Lite & 402 ditegakkan; **entitlement fail-open** (T2), race kuota paralel (S3), `usersLimit` tidak ditegakkan |
| Pembayaran langganan Midtrans | 🟡 | Signature webhook benar; checkout kini wajib login admin; state machine webhook (cancel/refund) belum benar (S12). Hanya diuji mode simulasi/sandbox |
| Penomoran & termin | ✅ | Counter per org; counter termin diperbaiki (T9) dan cek ≤100% dikunci (S4a) |
| Pembayaran → kwitansi | 🟡 | Atomik; overpayment ditolak server, tetapi dua pembayaran paralel bisa melebihi total (S4) |
| Store UI | ✅ fail-closed (13 Okt) | Penolakan server (402/403/422) diteruskan; aksi finansial tidak pernah dibuat lokal |
| Auth web | 🟡 | Session HttpOnly (scrypt), RBAC 4 peran. **Admin default dibuat juga di production saat DB kosong & kredensial demo tampil di halaman login** (T7) |
| API mobile & TTE | 🟡 | Perangkat terikat ke pemilik & secret JWT wajib di production (13 Okt). Belum: rate limit login mobile, nonce anti-replay, lockout PIN, rotasi refresh token |
| Delivery email/WA | 🟡 | Per workspace, terenkripsi. SSRF SMTP (S9), fallback kunci enkripsi (S10), penerbit di email hardcode SMKarier (R2). Reminder terjadwal belum ada |
| Halaman validasi publik | 🟡 | Hash diverifikasi ulang; respons memuat field internal berlebihan (S11) |
| Klaim pemasaran | 🔴 | Rating palsu di JSON-LD, Hak Guna on-premise yang belum ada, "backup harian", "tidak bisa dipalsukan" — AUDIT_PRODUK §3D |
| Fitur produk vs DocFlow | 🔴 | Belum ada edit draft, revisi, diskon, void, ekspor, qty desimal, PPh 23 per jasa, potongan pajak saat bayar — [RENCANA_PORTING.md](./RENCANA_PORTING.md) |
| Mobile companion (Flutter) | `OPEN` | Kode ada dan sudah di-commit lokal. Kontrak dengan backend belum diverifikasi (mis. login belum mengirim `deviceId`) |
| Deployment | `OPEN` | Target Hostinger Node.js; env production, proxy, TZ, backup belum disiapkan |

---

## 2. Yang Sudah Selesai

### Product / UI

- Landing, registrasi `/daftar` (trial 30 hari), login, dashboard, master klien, builder Penawaran & Invoice dengan preview A4, termin DP/progres/retensi/pelunasan, pembayaran → kwitansi, QR validasi publik, print A4 hemat tinta.
- `/langganan`: paket, progress kuota bulanan, masa aktif, riwayat transaksi, checkout Midtrans Snap (`/pembayaran/sukses` mem-polling status).
- `/pengaturan`: profil perusahaan, rekening, delivery email/WA, reset data demo (hanya workspace demo).

### Server / Data

- Multi-tenant `Organization` + `organizationId` di semua tabel domain; nomor dokumen & kode klien unik per org.
- Paket & kuota (`src/lib/plans.ts`, `src/lib/server/plan.ts`), 402 terstruktur.
- Snapshot immutable + hash canonical diverifikasi server; penomoran atomik `FOR UPDATE`.
- Delivery email/WA per org (AES-256-GCM), DeliveryLog per org.
- API mobile: login/refresh, register perangkat, dashboard, pending approval, detail dokumen, sign/reject, quick-record pembayaran.
- AuditLog untuk publish/status/receipt/settings/mobile sign (**belum per org** — R1).

---

## 3. Blocker Production (Tahap 0)

Rincian, bukti `file:baris`, dan rekomendasi ada di [AUDIT_PRODUK.md](./AUDIT_PRODUK.md) §3A, §3D, §5.

1. **T7** — `ensureAdminUser` membuat admin dengan password default di production saat tabel user kosong; kredensial demo tampil di halaman login.
2. **T2 + S12** — entitlement fail-open; webhook tidak menurunkan plan saat cancel/expire/refund.
3. **T5 + T6** — rate limit login mobile; kunci limiter dari `X-Forwarded-For` yang bisa dipalsukan.
4. **S3 + S4** — kuota dan total pembayaran harus dicek di dalam transaksi dengan lock.
5. **S10 + S11** — `DELIVERY_ENC_KEY` wajib di production; serializer allowlist untuk halaman validasi publik.
6. **Klaim pemasaran M1–M10** — koreksi copy; keluarkan Hak Guna dari checkout self-serve.
7. **Operasional** — env production (`MOBILE_JWT_SECRET`, `DELIVERY_ENC_KEY`, Midtrans production), backup terjadwal + uji restore, health check & monitoring, rencana rollback.

---

## 4. Pengujian

| Area | Metode | Hasil terakhir |
| --- | --- | --- |
| Build | `npm run build` | Lulus, 13 Okt 2026 (`VERIFIED-LOCAL`) |
| Type | `npx tsc --noEmit` | Bersih, 13 Okt 2026 |
| Unit (calc, hash, numbering, RBAC, zod, secret, midtrans, plan, mobile JWT/ECDSA, store fail-closed, AppShell redirect, guard secret) | `npm test` | Lulus |
| Integration DB (`nusadoc_dev`) — counter paralel, rollback payment, SaaS & kuota, **counter termin route**, **isolasi tenant billing/reset/perangkat** | `npm test` | Lulus; data uji dibersihkan (0 sisa, dicek) |
| Total | `npm test` | **110/110** (13 file) |
| API (`tests/api`, butuh server hidup) | `npm run test:api` | Tidak dijalankan 13 Okt |
| Browser | Preview lokal port 3005 | `/dashboard` tanpa sesi → `/login` tanpa error Router (13 Okt) |

Belum ada: E2E browser otomatis, uji beban, uji backup/restore, pentest runtime, uji kontrak aplikasi Flutter terhadap API.

---

## 5. Cara Memulai Sesi Berikutnya

1. Baca: `AGENTS.md` → dokumen ini → `docs/AUDIT_PRODUK.md` → `docs/PRD.md` → `docs/WORKFLOW.md`.
2. `git status --short` dan `git log --oneline -12`; jangan menghapus perubahan yang tidak terkait. Jangan bekerja di worktree terpisah selama ada perubahan yang belum di-commit.
3. Pastikan `.env` lokal ada; **jangan buka atau tampilkan isinya**.
4. Perubahan skema: `prisma migrate diff` → folder migration → `npx prisma migrate deploy`. Jangan `db push`/reset di DB bersama.
5. Integration test menulis ke `nusadoc_dev` — hanya dengan data berprefix `TEST-`/`[TEST]`/`org_test_` yang dibersihkan di `afterAll`. Pertahankan pola ini.
6. Midtrans/Fonnte/WaBlas hanya sandbox/test. Tidak ada deploy, push, atau kirim pesan nyata tanpa izin eksplisit.
7. Setelah perubahan perilaku: update `PRD.md`, dokumen ini, dan `PROGRESS_LOG.md` dalam commit yang sama.

---

## 6. Next Recommended Slice

1. **Commit perbaikan audit 13 Okt** (menunggu izin Imam).
2. **Tahap 0** (AUDIT_PRODUK §5): T7 → T2/S12 → S3/S4 → T5/T6 → S10/S11 → koreksi klaim.
3. **Keputusan Imam** atas RENCANA_PORTING (kuota Q1–Q6, strategi dua produk), lalu porting Tahap 1 lewat merge 3-arah.

---

## Riwayat Slice (arsip — fakta pada tanggalnya)

> Bagian di bawah dipertahankan sebagai histori. Status terkini selalu mengikuti §1–§6 di atas.

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



---

## 11. Audit Kebenaran & Perbaikan Isolasi Tenant (13 Oktober 2026)

Pekerjaan 29 Sep–2 Okt diamankan dalam 10 commit lokal di branch `feat/saas-multitenant` (`c9c2a82`…`d2a743a`). Audit read-only lalu menghasilkan [AUDIT_PRODUK.md](./AUDIT_PRODUK.md) dan [RENCANA_PORTING.md](./RENCANA_PORTING.md). Perbaikan di bawah **belum di-commit**.

| Temuan | Perbaikan | Verifikasi |
| --- | --- | --- |
| K1 `simulated-pay` mengaktifkan paket gratis | Hanya development tanpa server key; sesi admin workspace pemilik; sekali pakai (`status: pending`) | `tenant-isolation.test.ts` — gagal di kode lama, lulus setelah perbaikan |
| K2 reset demo menghapus semua tenant | Hanya workspace demo; `clearDatabase(db, orgId)` menolak org kosong | `tenant-isolation.test.ts` (kasus positif sengaja tidak dijalankan agar data demo dev tetap) |
| T1 order diikat lewat email; T1b `"simulated"` diterima di production | Checkout wajib login admin, order milik workspace sesi; webhook tidak menautkan lewat email; signature simulasi hanya dev tanpa server key | `tenant-isolation.test.ts`, `secrets-guard.test.ts` |
| T3 pengambilalihan `deviceId`; T4 secret JWT fallback | 409 bila perangkat milik akun lain; sign wajib perangkat aktif milik sendiri; `MOBILE_JWT_SECRET` wajib di production | `tenant-isolation.test.ts`, `secrets-guard.test.ts` |
| T9 counter termin `TERM-*`; S4a race ≤100% | `ensureCounter` dari termin tertinggi; kunci counter sebelum menghitung total; `allocateCounter` gagal keras tanpa baris | `invoice-termin.test.ts` — kode lama 3/3 gagal (unique constraint) |
| Store tidak fail-closed | `ApiError`/`NetworkError`, fallback finansial lokal dihapus, toast error di semua pemanggil | `store-failclosed.test.tsx` |
| `AppShell` navigasi saat render | `useEffect` | `appshell-redirect.test.tsx` (gagal di kode lama) + browser |

Catatan: `src/lib/numbering.ts` kini tidak dipakai kode aplikasi (hanya test) dan dijadwalkan dihapus saat porting (P8). `.claude/launch.json` (preview lokal port 3005) ditambahkan untuk uji browser.
