# Progress Log — Nafiga DocFlow

> Log ini bersifat append-only. Tambahkan entry baru di atas; jangan menulis ulang histori kecuali faktanya salah. Detail kondisi saat ini ada di [CURRENT_STATE.md](./CURRENT_STATE.md).

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
- **Nomor termin immutable:** `NTS/INV/<periode quotation>/<seq>-T<n>` dari identitas penawaran + unique constraint `[quotationId, terminIndex]` — menutup collision lintas bulan.
- **RBAC per-fitur:** permission map (admin/finance/sales/viewer), `requirePermission` di semua write API, gating UI via `useCan`, akun demo sales@/viewer@nafiga.co.id.
- **Operasional:** `GET /api/health`, migration versioned `20260913210000_snapshot_counter_rbac`.

### Verified

- `npm run build` sukses.
- Concurrency: 10 POST penawaran paralel → 10 sukses, nomor 016–025 unik berurutan.
- Snapshot: ubah nama klien master → dokumen & validasi publik tetap menampilkan nama saat terbit; hashValid true.
- RBAC: sales publish 200 / payment 403 / approve 403; viewer write 403.
- Termin: quo-002 approved → invoice `NTS/INV/2026/09/001-T1` + snapshot terisi.
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
