# NusaDoc

**Kendali arus kas proyek untuk bisnis B2B Indonesia — dari penawaran sampai uang masuk.**

NusaDoc adalah SaaS multi-tenant milik **PT SMKarier Inovasi Digital** untuk kontraktor, system integrator, agensi, konsultan, dan vendor pengadaan. Penawaran yang disetujui ditagih lewat invoice multi-termin, setiap pembayaran menerbitkan kwitansi otomatis, dan setiap dokumen bisa dicek keasliannya lewat QR publik.

```text
Master Klien → Penawaran → Invoice (multi-termin) → Pembayaran → Kwitansi otomatis
```

- **Multi-tenant:** setiap workspace (`Organization`) terisolasi; registrasi mandiri `/daftar` dengan trial 30 hari.
- **Paket:** Trial · Lite Rp50.000/bln (25 dokumen/bln) · Bulanan Rp249.000/bln · Hak Guna · Enterprise. Katalog di `src/lib/plans.ts`, kuota ditegakkan server (HTTP 402). Pembayaran langganan via Midtrans Snap.
- **Dokumen:** nomor atomik per workspace, snapshot immutable, token QR acak, hash SHA-256 yang diverifikasi ulang server di `/v/[token]`.
- **Pengiriman:** email (SMTP) & WhatsApp (Fonnte/WaBlas) per workspace, kredensial terenkripsi AES-256-GCM.
- **Mobile companion:** API `/api/mobile/*` untuk aplikasi Flutter `nusadoc-mobile` (persetujuan via biometrik/PIN perangkat terdaftar).

> Status: **development**. Belum siap production sampai Tahap 0 di [docs/AUDIT_PRODUK.md](./docs/AUDIT_PRODUK.md) selesai. Kondisi faktual terbaru ada di [docs/CURRENT_STATE.md](./docs/CURRENT_STATE.md).

## Stack

- Next.js 16 App Router + React 19 + TypeScript, Tailwind CSS 3, Framer Motion, lucide-react, qrcode.react
- Prisma 5.22 + MySQL, migrations versioned di `prisma/migrations`
- Vitest (unit + integration DB + API)

## Menjalankan lokal

```bash
cp .env.example .env
```

Isi `.env` dengan koneksi MySQL lokal. Isi juga kunci yang dibutuhkan (`DELIVERY_ENC_KEY`, `MOBILE_JWT_SECRET`, dan kunci sandbox Midtrans bila ingin menguji checkout asli). Tanpa kunci Midtrans, checkout berjalan dalam mode simulasi khusus development. Jangan pernah meng-commit `.env`.

Untuk lingkungan development Imam, database-nya `nusadoc_dev` di container `dev-shared-mysql-1`. Kredensialnya tidak boleh disalin ke file yang dilacak Git.

```bash
npm install
npx prisma generate
npx prisma migrate deploy   # terapkan migration versioned — jangan db push / reset di DB bersama
npm run dev                 # http://localhost:3000
```

Data demo dibuat otomatis di workspace `org_demo` saat development (bootstrap pertama). User awal dibuat dengan kata sandi dari `ADMIN_INITIAL_PASSWORD`. Setel nilainya di `.env` dan ganti setelah login pertama. Workspace baru dibuat lewat `/daftar`.

## Perintah penting

```bash
npm run build        # build produksi + type-check
npm test             # unit + integration (menulis ke DB dev hanya dengan data uji berprefix TEST/org_test_, lalu dibersihkan)
npm run test:api     # test API terhadap server yang berjalan (NUSADOC_TEST_BASE_URL)
npx prisma migrate deploy
```

Perubahan skema: `prisma migrate diff` → folder migration baru → `prisma migrate deploy`. Lihat [docs/WORKFLOW.md](./docs/WORKFLOW.md).

## Catatan hukum & keamanan

- QR + hash SHA-256 membuktikan bahwa isi dokumen **cocok dengan arsip server penerbit**. Ini **bukan** tanda tangan elektronik tersertifikasi PSrE, dan bukan e-Meterai.
- Persetujuan di aplikasi mobile (biometrik/PIN perangkat terdaftar) adalah **tanda tangan elektronik tidak tersertifikasi** yang beraudit.
- Invoice NusaDoc adalah invoice komersial, **bukan Faktur Pajak**. Faktur Pajak tetap dibuat di Coretax DJP.
- PDF memakai dialog cetak browser (`window.print()`), belum PDF server-side.

## Dokumentasi

- [AGENTS.md](./AGENTS.md) — ringkasan untuk developer/agent.
- [Current State](./docs/CURRENT_STATE.md) — fakta implementasi, blocker production, langkah berikutnya.
- [Audit Produk](./docs/AUDIT_PRODUK.md) — temuan keamanan/kebenaran/klaim, visi, roadmap, metrik.
- [Rencana Porting](./docs/RENCANA_PORTING.md) — porting fitur DocFlow & strategi dua produk (usulan).
- [PRD](./docs/PRD.md) — visi, aturan bisnis, acceptance criteria.
- [Architecture](./docs/ARCHITECTURE.md) — boundary client/server/database dan endpoint.
- [Workflow & Agent Rules](./docs/WORKFLOW.md) — standar kerja.
- [Progress Log](./docs/PROGRESS_LOG.md) — histori perubahan.
