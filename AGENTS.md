# Nusadoc — AGENTS.md

Mockup frontend **Penawaran & Invoice Management** untuk PT. Nusadoc Technology System (System Integrator) — kini sudah **fase database MySQL** (Prisma + API routes), dengan fallback mock localStorage bila DB tak terjangkau. PDF server-side & auth nyata menyusul.

## Stack & pola

- Next.js 16 App Router + React 19 + TypeScript + Tailwind 3 + Framer Motion + lucide-react + qrcode.react (disamakan dengan `~/nusadoc-website`).
- Light mode. Font: Inter (body) + Space Grotesk (heading) via `next/font`.
- Brand: navy `#0b2341` · blue `#087ed4` · orange `#f97316` · bg `#f4f7fa` · line `#d8e1e8` · panel putih. Aset logo di `public/images/brand/`.
- Login: split panel navy (kiri) + form terang lembut (kanan). Auth session HttpOnly server-side (scrypt). Login: admin@smkarier.co.id / docflow-admin.

## Database & API (fase aktif)

- MySQL lokal: container Docker **`dev-shared-mysql-1`** (port 3306, milik environment dev bersama); database **`nusadoc_docflow`**. Alternatif: laradock `/home/imamnj/app-laradock`. Kredensial di `.env` (`DATABASE_URL`) — **jangan pernah ditampilkan/dikommit** (sudah di .gitignore).
- Prisma 5.22 (selaras nusadoc-website), schema `prisma/schema.prisma`: Client, Quotation, Invoice, Payment↔Receipt (FK di Receipt.paymentId agar insert tidak sirkular), ItemTemplate, CompanySettings. `items` & `banks` disimpan JSON (bentuk = tipe aplikasi); amount `BigInt`.
- **Penomoran, token acak & hash SHA-256 dihitung server-side** (`src/app/api/*`): POST `/api/quotations`, `/api/invoices`, `/api/payments` (payment+kwitansi satu transaksi), PATCH status, `/api/clients`, `/api/templates`, PUT `/api/settings`, POST `/api/reset` (reseed demo), GET `/api/bootstrap` (autoseed bila kosong).
- `src/lib/store.tsx`: API-first via context; kalau API gagal → fallback mock localStorage (`localMode`). Draft builder tetap autosave localStorage (draft ≠ dokumen terbit).
- Perintah: `npx prisma db push` (schema), `npx prisma generate`. Reset data demo dari halaman Pengaturan.

## Alur dokumen (fixed, jangan diubah)

Master Klien → **PENAWARAN** (Draft/Terkirim/Disetujui/Ditolak/Kedaluwarsa — Kedaluwarsa dihitung otomatis) → **INVOICE** (1 penawaran → banyak invoice termin DP/progres/retensi/pelunasan; nomor `-T1`, `-T2` memakai seq penawaran induk; preset + Kustom %; bisa juga langsung tanpa penawaran) → **KWITANSI** (otomatis per "Catat Pembayaran", tanpa draft, sekali terbit final).

- Status invoice **dihitung** dari akumulasi kwitansi (`src/lib/calc.ts`) — tidak pernah disimpan/diubah manual.
- Konversi dokumen carry-over penuh (klien + item proporsional termin) — tanpa input ulang.
- Nomor: `NTS/QUO/YYYY/MM/NNN` · `NTS/INV/YYYY/MM/NNN-T#` · `NTS/KWT/YYYY/MM/NNN`.
- Dokumen turunan wajib menampilkan referensi induk di badan dokumen (`PartyBlock` prop `reference`).

## Arsitektur frontend

- Komponen dokumen: `src/components/documents/` — keluarga tunggal untuk 3 jenis dokumen: `DocumentSheet` (+`DocPreview` scaling) · `DocumentHeader` · `PartyBlock` · `LineItemTable` · `TotalsPanel`/`TerbilangBlock` · `SignatureBlock` (QR + hash + specimen) · `DocumentFooter`; komposisi `QuotationSheet`/`InvoiceSheet`/`ReceiptSheet`.
- Builder: `src/components/builder/` — split screen, 4 blok collapsible, input harga auto-format ribuan, terbilang otomatis, template item, autosave draft (`useDocDraft`).
- Halaman: `(app)` route group auth-gate mock; `/v/[token]` publik untuk validasi QR (URL memakai `window.location.origin` → otomatis benar di domain produksi).

## Aturan dokumen hemat tinta (penting)

Referensi lama memakai blok latar hijau/navy luas + `print-color-adjust: exact` — boros tinta di DeskJet. Di project ini: warna brand hanya untuk garis tipis, label kecil, dan teks. Header tabel: latar `#f4f7fa` + border bawah tegas. Badge status outline. Bar total & terbilang: latar `#f4f7fa` + border kiri orange. CSS print mematikan sisa latar (`print:bg-white`) — lihat `src/app/globals.css`.

## "Tanda tangan digital"

= specimen tanda tangan + QR verifikasi (URL `/v/<token>`) + hash SHA-256 dokumen. **Bukan** tanda tangan elektronik tersertifikasi PSrE — bila perlu kekuatan hukum penuh, integrasi terpisah (Privy/Peruri).

## Menjalankan

```bash
npm run dev          # http://localhost:3000 (MySQL dev-shared harus jalan)
npm run build        # verifikasi produksi
npx prisma db push   # sinkron schema
```

Login mock: kredensial apa pun. Reset data demo: halaman `/pengaturan`. Backlog UI: preset "Sisa pelunasan auto %" di builder invoice.

