# Nusadoc — AGENTS.md

SaaS B2B **Penawaran, Invoice Multi-Termin & Kwitansi Otomatis** dengan QR verifikasi publik dan TTE Biometrik mobile untuk PT. SMKarier Inovasi Digital.

## Stack & pola

- Next.js 16 App Router + React 19 + TypeScript + Tailwind 3 + Framer Motion + lucide-react + qrcode.react.
- Mobile Companion: Flutter 3.x + Riverpod + Biometric TTE di repo `/home/imamnj/nusadoc-mobile`.
- Database: MySQL lokal container `dev-shared-mysql-1` (port 3306), database `nusadoc_dev`.
- Brand: navy `#0b2341` · blue `#087ed4` · orange `#f97316` · bg `#f4f7fa` · line `#d8e1e8`. Logo resmi di `public/images/brand/`.
- Auth: Multi-tenant, session HttpOnly (scrypt) untuk web; JWT dual-mode untuk mobile app.

## Arsitektur SaaS Multi-Tenant & Paket

- **Model `Organization`**: Setiap tenant terisolasi mandiri. Data demo di-backfill ke workspace `org_demo` (plan `hakguna` = lifetime).
- **Katalog Paket (`src/lib/plans.ts`)**:
  - `trial`: Gratis 30 hari, dokumen tanpa batas (via registrasi `/daftar`).
  - `lite`: Rp 50.000 / bulan, kuota maksimal **25 dokumen / bulan** (ditegakkan server via `assertCanPublish()`).
  - `bulanan`: Rp 249.000 / bulan, unlimited dokumen, 3 pengguna.
  - `hakguna`: Rp 19.900.000 sekali bayar selamanya (on-premise self-hosted).
  - `enterprise`: Kustom via WhatsApp.
- **Enforcement Kuota (`src/lib/server/plan.ts`)**:
  - Penawaran, Invoice, dan Kwitansi memanggil `assertCanPublish(organizationId)` sebelum diterbitkan. Menolak dengan HTTP 402 bila kuota habis atau akun expired.
- **Halaman Billing**: `/langganan` lengkap dengan progress bar kuota dokumen bulanan, status masa aktif, dan upgrade via Midtrans Snap.

## Mobile TTE Backend (`/api/mobile/*`)

- `model DeviceSigner`: Pendaftaran hardware smartphone, public key ECDSA P-256, device token FCM, PIN cadangan.
- `model DocumentSignatureLog`: Jejak audit penandatanganan dokumen (signer, signature proof, device, IP, koordinat, timestamp).
- REST API Mobile: login, refresh token, register device, dashboard eksekutif, pending approvals, review dokumen, penandatanganan biometrik (`/sign`), penolakan (`/reject`), dan pencatatan pembayaran cepat (`/payments/quick-record`).

## Menjalankan & Menguji

```bash
npm run dev                 # dev server web (http://localhost:3000)
npm run build               # verifikasi build produksi (55 entri route)
npm test                    # 110 test unit & integration (integration menulis data uji berprefix TEST/org_test_ ke nusadoc_dev lalu membersihkannya)
npx prisma migrate deploy   # terapkan migrations versioned (skema baru: prisma migrate diff → folder migration → deploy)
```

## Wajib dibaca sebelum mengubah kode

- `docs/CURRENT_STATE.md` — status nyata & blocker production (status: **belum production**).
- `docs/AUDIT_PRODUK.md` — temuan keamanan/isolasi tenant/klaim (rujukan `file:baris` @ `d2a743a`), visi "kendali arus kas proyek", roadmap Tahap 0–4.
- `docs/RENCANA_PORTING.md` — porting fitur DocFlow lewat merge 3-arah (basis `nafiga-docflow@a875785`) + checklist tenant/kuota; **usulan, belum disetujui**.

## Aturan tenant & billing (jangan dilanggar)

- Setiap query baca/tulis/hapus dan setiap referensi silang memfilter `organizationId`; endpoint baru wajib punya test integration lintas tenant (pola `tests/integration/tenant-isolation.test.ts`).
- Order langganan hanya dari sesi admin dan selalu milik workspace sesi itu — jangan pernah menautkan workspace lewat email.
- Endpoint/jalur simulasi (pelunasan simulasi, signature "simulated", `simulateApproval`) hanya untuk development tanpa kunci asli.
- Store UI gagal tertutup: penolakan server (402/403/422) diteruskan ke UI; dokumen finansial tidak pernah dibuat lokal.
- Copy publik: tanpa rating/angka yang tidak berdata, tanpa klaim "sah/tidak bisa dipalsukan/TTE tersertifikasi" (lihat AUDIT_PRODUK §3D).

