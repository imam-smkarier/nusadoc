# Nusadoc

Modul **Penawaran, Invoice, dan Kwitansi** untuk PT. Nusadoc Technology System. Dibangun sebagai fondasi ERP dengan alur dokumen terhubung:

> Master Klien → Penawaran → Invoice (multi-termin) → Pembayaran → Kwitansi otomatis

Setiap dokumen terbit punya nomor server-side, token QR validasi acak, dan hash SHA-256. Halaman `/v/[token]` dapat dibuka publik tanpa login untuk memvalidasi dokumen.

## Stack

- Next.js 16 App Router + React 19 + TypeScript
- Tailwind CSS 3 + Framer Motion + lucide-react + qrcode.react
- Prisma 5 + MySQL

## Menjalankan Lokal

### 1. Siapkan environment

```bash
cp .env.example .env
# Isi DATABASE_URL dengan koneksi MySQL lokal Anda.
```

Untuk environment development Imam, database MySQL adalah `nusadoc_docflow` pada container Docker `dev-shared-mysql-1`. Jangan menyalin kredensialnya ke file apa pun yang dilacak Git.

### 2. Install & siapkan schema

```bash
npm install
npx prisma generate
npx prisma db push
```

### 3. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Login server-side: user awal `admin@smkarier.co.id` dengan kata sandi `docflow-admin` (dibuat otomatis pada database development — ubah `ADMIN_INITIAL_PASSWORD` di `.env` sebelum dipakai tim, dan ganti setelah login pertama).

Database terisi otomatis dengan data demo saat endpoint bootstrap pertama kali diakses. Data demo dapat direset melalui **Pengaturan → Reset Data Demo**.

## Perintah penting

```bash
npm run build        # Build produksi + type-check
npx prisma generate  # Buat ulang Prisma Client
npx prisma db push   # Sinkron schema MySQL (jangan gunakan --force-reset di production)
```

## Catatan keamanan & status fase

- **MySQL dan API sudah aktif.** Data terbit disimpan melalui API routes; penomoran, token, dan hash dihitung server-side.
- Auth masih mock dan harus diganti sebelum production.
- QR + specimen tanda tangan + hash adalah mekanisme validasi visual, **bukan** tanda tangan elektronik tersertifikasi PSrE.
- PDF saat ini memakai dialog cetak browser (`window.print()`), bukan PDF server-side.

Arsitektur, alur dokumen yang tidak boleh diubah, dan instruksi developer detail tersedia di [AGENTS.md](./AGENTS.md).

## Dokumentasi Pengembangan

- [PRD](./docs/PRD.md) — tujuan produk, aturan bisnis, acceptance criteria, dan roadmap.
- [Current State](./docs/CURRENT_STATE.md) — fitur selesai, blocker production, serta next slice yang direkomendasikan.
- [Architecture](./docs/ARCHITECTURE.md) — boundary client/server/database dan endpoint.
- [Workflow & Agent Rules](./docs/WORKFLOW.md) — standar kerja yang harus diikuti agent/model/contributor berikutnya.
- [Progress Log](./docs/PROGRESS_LOG.md) — histori perubahan fase.
- [Diagram arsitektur](./docs/assets/docflow-architecture.svg) — visual alur produk dan sistem.
