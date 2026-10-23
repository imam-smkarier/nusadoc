# Audit Kebenaran, Keamanan & Visi Produk — NusaDoc

| Properti | Nilai |
| --- | --- |
| Tanggal audit | 13 Oktober 2026 |
| Basis kode | Branch `feat/saas-multitenant`, commit `d2a743a`. **Semua rujukan `file:baris` di dokumen ini merujuk ke commit tersebut** (sebelum perbaikan sesi ini) |
| Pertanyaan audit | (1) Apakah NusaDoc aman dan benar sebagai SaaS multi-tenant yang menerima uang? (2) Apakah NusaDoc lebih bermanfaat daripada Word/Excel/Paper.id bagi pembelinya? |
| Metode | Membaca kode sumber; `npm run build`; `npm test`; `prisma migrate status`; tiga audit statis paralel (isolasi tenant per endpoint, alur uang & auth, klaim pemasaran) yang temuan kritisnya diverifikasi ulang secara manual; uji browser lokal terbatas; perbandingan dengan basis DocFlow |
| Belum dilakukan | Pentest runtime terhadap server yang berjalan; cek environment production/hosting (NODE_ENV, env Midtrans, proxy, TZ); wawancara calon pembeli; review hukum oleh konsultan |
| Dokumen terkait | [RENCANA_PORTING.md](./RENCANA_PORTING.md) — porting fitur DocFlow & strategi dua produk · [CURRENT_STATE.md](./CURRENT_STATE.md) |

Label bukti: `VERIFIED-CODE` (terbukti dari kode) · `VERIFIED-LOCAL` (dijalankan langsung di lokal) · `REPORTED-*` (dilaporkan, bukan diakses langsung) · `OPEN` (perlu keputusan/konfirmasi).

---

## 1. Ringkasan untuk Pengambil Keputusan

**Lapisan SaaS-nya lebih maju daripada DocFlow, tetapi saat diaudit belum aman untuk menerima uang, dan produknya tertinggal dari DocFlow di pekerjaan harian.**

1. **Ada celah yang langsung merugikan bisnis.** Siapa pun yang punya akun trial bisa mengaktifkan paket Hak Guna (Rp19,9 jt) tanpa membayar lewat `simulated-pay`. Siapa pun juga bisa mengubah paket workspace orang lain hanya dengan mengetik email admin-nya saat checkout. Di lingkungan non-production, pendaftar trial bisa menghapus data dokumen **semua tenant** lewat "Reset Data Demo". Celah ini dan beberapa celah lintas tenant lainnya **sudah diperbaiki di sesi ini dan dibuktikan dengan test** (§Status).
2. **Isolasi data antar-tenant pada data dokumen sudah baik.** Semua route CRUD klien, penawaran, invoice, pembayaran, template, pengaturan, dan delivery memfilter `organizationId`, termasuk referensi silang (`clientId`, `quotationId`, `invoiceId`). Kebocoran justru ada di billing, reset demo, dan perangkat TTE mobile.
3. **Dari sisi pengguna, NusaDoc sama kakunya dengan DocFlow sebelum diaudit.** Tidak bisa edit draft, revisi, diskon, void, atau ekspor. Qty harus bulat, PPh 23 dihitung dari seluruh subtotal, dan nilai termin bisa selisih beberapa rupiah dari kontrak. DocFlow sudah memperbaiki semua ini pada 13 Okt (lihat [RENCANA_PORTING.md](./RENCANA_PORTING.md)).
4. **Pemasaran menjanjikan lebih dari yang ada.** Masalahnya meliputi rating 4,9 dari 128 ulasan yang dikarang di JSON-LD, paket "on-premise milik selamanya" tanpa paket instalasi atau EULA, "backup harian" yang tidak ada, garansi uang kembali tanpa syarat tertulis, dan klaim "tidak bisa dipalsukan / kwitansi sah / 100% ASLI". Ini risiko hukum (UU Perlindungan Konsumen) dan reputasi, dan juga melanggar kebijakan structured data Google.

**Rekomendasi keputusan:**

| # | Keputusan | Alasan |
| --- | --- | --- |
| 1 | **Jangan beriklan atau go-live sebelum Tahap 0 selesai** (sisa celah P0 + koreksi klaim, §5) | Celah billing dan klaim palsu lebih mahal ditutup setelah ada pelanggan |
| 2 | **Reposisi: "kendali arus kas proyek — dari penawaran sampai uang masuk"** | Melawan Paper.id/Jurnal di dokumen dan pembayaran = kalah. Termin proyek, kepastian pajak, koreksi beraudit, dan verifikasi QR adalah wilayah yang belum mereka garap (§2, §4) |
| 3 | **Ambil fitur DocFlow lewat merge 3-arah, bukan ketik ulang** | Commit awal DocFlow `a875785` ternyata identik dengan basis fork NusaDoc (`calc.ts` 0 baris beda), jadi porting bisa mekanis. Lihat [RENCANA_PORTING.md](./RENCANA_PORTING.md) |
| 4 | **Tarik Hak Guna dari checkout self-serve** sampai paket instalasi, EULA, dan syarat garansi tersedia | Saat ini pembeli Rp19,9 jt hanya mendapat workspace cloud berstatus lifetime |

---

## Status Perbaikan — 13 Oktober 2026 (sesi ini, belum di-commit)

Semua perbaikan di bawah dibuktikan dengan test vitest. Setiap test baru **dijalankan juga terhadap kode lama dan terbukti gagal di sana**, kecuali test reset (lihat catatan). `npm test`: **110/110 lulus** (75 lama + 35 baru), `npm run build` lulus, `tsc --noEmit` bersih (`VERIFIED-LOCAL`).

| ID | Masalah | Perbaikan | Bukti test |
| --- | --- | --- | --- |
| K1 | `simulated-pay` mengaktifkan paket apa pun tanpa auth, tanpa guard env, dan bisa diulang | Hanya ada di development tanpa server key Midtrans; wajib sesi admin workspace pemilik order; update bersyarat `status: pending` (sekali pakai) | `tests/integration/tenant-isolation.test.ts` (4 kasus) |
| K2 | `/api/reset` → `clearDatabase()` menghapus data **semua tenant** | Reset hanya untuk workspace demo; `clearDatabase(db, orgId)` wajib org dan menolak org kosong | idem (2 kasus; kasus positif tidak dijalankan agar data demo dev tidak tersentuh) |
| T1 | Checkout tamu & webhook menautkan order ke workspace lewat email yang diketik pembeli | Checkout wajib login sebagai admin; order selalu milik workspace sesi; webhook tidak lagi menautkan lewat email; modal checkout mengarahkan tamu ke `/daftar` | idem (4 kasus) |
| T1b | Signature `"simulated"` diterima webhook kapan pun kunci Midtrans belum lengkap, termasuk di production | Hanya di development tanpa server key; perbandingan signature tahan panjang berbeda | `tests/unit/secrets-guard.test.ts`, `tenant-isolation.test.ts` |
| T3 | `deviceId` mobile bisa diambil alih user tenant lain (menimpa kunci/PIN, tanda tangan tercatat atas perangkat korban) | Login & register menolak 409 bila perangkat milik akun lain; sign mewajibkan perangkat aktif milik penanda tangan | `tenant-isolation.test.ts` (3 kasus) |
| T4 | Secret JWT mobile jatuh ke `DATABASE_URL` atau literal yang terlihat di repo publik | Production wajib `MOBILE_JWT_SECRET` (menolak menerbitkan/memverifikasi tanpa itu); ditambahkan ke `.env.example` | `secrets-guard.test.ts` (3 kasus) |
| T9 | Counter termin `TERM-{id}` tidak pernah dibuat → termin ke-2/ke-3 selalu 500 | `ensureCounter` diinisialisasi dari termin tertinggi; `allocateCounter` gagal keras bila baris tidak ada | `tests/integration/invoice-termin.test.ts` (3 kasus; kode lama: 3 gagal dengan unique constraint) |
| S4a | Cek total termin ≤100% bisa diterobos dua request paralel | Counter termin dikunci (`FOR UPDATE`) **sebelum** total termin dibaca | idem — dua termin 60% paralel → tepat satu 201, satu 422 |
| F1 | Store menangkap semua error (termasuk 402/403/422) lalu membuat penawaran/invoice/kwitansi palsu di browser — kuota 402 bisa "diakali" tampilan | `ApiError`/`NetworkError`; penolakan server diteruskan ke UI; aksi finansial gagal tertutup saat server putus; fallback finansial lokal dihapus; semua pemanggil menampilkan toast error (sebelumnya beberapa menampilkan toast sukses palsu) | `tests/unit/store-failclosed.test.tsx` (10 kasus) |
| F2 | `AppShell` memanggil `router.replace` saat render | Dipindah ke `useEffect` | `tests/unit/appshell-redirect.test.tsx`; uji browser: `/dashboard` tanpa sesi → `/login` tanpa error Router (`VERIFIED-LOCAL`) |

Catatan: test integration menulis ke `nusadoc_dev` hanya dengan workspace/baris berprefix `org_test_` / `[TEST]` / `TEST-` dan membersihkannya di `afterAll`. Pengecekan setelah run: 0 baris tersisa (`VERIFIED-LOCAL`).

---

## 2. Uji "Kenapa Tidak Pakai Word/Excel/Paper.id Saja?"

Kolom Paper.id berdasarkan informasi publik situs Paper.id per 13 Okt 2026, bukan uji coba langsung (`OPEN`, perlu dicoba dengan akun trial). Menurut sumber publik, Paper.id menyediakan invoice, quotation, PO, dan kwitansi; tautan pembayaran 30+ metode (QRIS, VA, kartu); rekonsiliasi otomatis; pengingat; pengiriman via WhatsApp, SMS, dan email; serta e-Meterai Peruri. Sumber: [paper.id/en](https://www.paper.id/en), [Sales Invoice](https://www.paper.id/en/sales-invoice.php), [Buyer Portal / e-Meterai](https://www.paper.id/en/buyer-portal.php).

| # | Pekerjaan pengguna | Word/Excel | Paper.id (publik) | NusaDoc saat ini | Hasil vs Word | Hasil vs Paper.id |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Membuat penawaran | Salin file lama, hitung ulang | Ada quotation | Builder + template + preview A4 + pajak & terbilang otomatis, tanpa diskon & qty desimal | 🟢 | 🟡 setara |
| 2 | Revisi setelah negosiasi | *Save As* | Tidak terverifikasi | **Tidak bisa** — ketik ulang dari nol | 🔴 | 🔴 |
| 3 | Betulkan salah ketik | Edit langsung | Tidak terverifikasi | **Tidak bisa** — draft pun terkunci | 🔴 | 🔴 |
| 4 | Kirim dokumen ke klien | Lampirkan PDF manual | WA/SMS/email + link bayar | Email/WA otomatis saat terbit **bila tenant memasang SMTP/token Fonnte/WaBlas sendiri**; yang dikirim tautan, bukan PDF | 🟢 | 🔴 kalah (setup & tanpa link bayar) |
| 5 | Invoice termin dari penawaran | Hitung persen manual | Tidak ditemukan termin terhubung penawaran | Otomatis `-T1/-T2`, server menolak >100% (termin ke-2 sempat rusak — T9, sudah diperbaiki) | 🟢 | 🟢 **pembeda** |
| 6 | Catat pembayaran & kwitansi | Sheet + Word | Rekonsiliasi otomatis dari link bayar | Satu aksi, kwitansi final; potongan PPh 23 tak bisa dicatat → invoice "Sebagian" selamanya | 🟢 | 🟡 |
| 7 | Tahu siapa ditagih hari ini | Filter sheet | Pengingat otomatis | Kartu "Jatuh Tempo" yang melewatkan invoice dibayar sebagian; reminder belum jalan (tanpa scheduler) | 🟡 | 🔴 |
| 8 | Posisi satu proyek | Rekap manual | Tidak ditemukan | Tidak ada ringkasan ditagih/dibayar/sisa | 🟡 | 🟡 |
| 9 | Serahkan data ke akuntan | Sudah sheet | Ekspor/API | **Tidak ada ekspor** | 🔴 | 🔴 |
| 10 | Buktikan keaslian dokumen | Tidak bisa | e-Meterai Peruri (keabsahan meterai) | QR publik + hash diverifikasi ulang server, isi dikunci saat terbit | 🟢 | 🟡 beda fungsi |
| 11 | Nomor anti-dobel & jejak audit | Tidak bisa | Tidak terverifikasi | Penomoran atomik + audit log (belum tampil di layar, belum per tenant) | 🟢 | 🟡 |
| 12 | Pajak proyek B2B (PPh 23 jasa, PPN 12% DPP nilai lain, pemungut) | Manual | Tidak terverifikasi | PPh 23 atas seluruh subtotal; tarif PPN statis | 🟡 | 🟡 |

**Skor vs Word/Excel: 6 lebih baik · 3 setara · 3 lebih buruk.** **Skor vs Paper.id: 1 lebih baik · 6 setara · 5 lebih buruk.**

Kesimpulannya, NusaDoc tidak akan menang melawan Paper.id di pembuatan dokumen, pengiriman, atau pembayaran. Satu-satunya pembeda yang sudah ada adalah **termin proyek yang terhubung ke penawaran**, ditambah verifikasi QR. Pembeda itu baru meyakinkan bila hitungan termin tepat rupiah, pajak proyek benar, koreksi beraudit, dan ada pusat penagihan. Semua itu sudah dibuat di DocFlow.

---

## 3. Temuan Detail

### 3A. Keamanan & isolasi tenant (P0)

Status: ✅ diperbaiki sesi ini · 🔴 terbuka · 🟠 terbuka, bersyarat environment.

| ID | Sev | Temuan | Bukti (`VERIFIED-CODE` @d2a743a) | Status / rekomendasi |
| --- | --- | --- | --- | --- |
| K1 | Kritis | Aktivasi paket berbayar gratis lewat `simulated-pay` (GET publik, tanpa guard production/konfigurasi, tanpa cek `pending`) | `src/app/api/subscription/simulated-pay/route.ts:6-57` | ✅ |
| K2 | Kritis (non-prod) | Reset demo menghapus data semua tenant; setiap pendaftar `/daftar` adalah admin | `src/app/api/reset/route.ts:17-20`, `src/lib/server/seedDb.ts:107-117`, `src/app/api/auth/register/route.ts:70` | ✅ |
| T1 | Tinggi | Order checkout tamu diikat ke workspace pemilik email apa pun; webhook menautkan lewat email; respons membocorkan `organizationId` | `src/app/api/subscription/checkout/route.ts:22-31,93`, `src/app/api/webhooks/midtrans/route.ts:55-68` | ✅ |
| T1b | Tinggi | Webhook menerima `signature_key: "simulated"` bila `isConfigured` false (butuh server **dan** client key) — juga di production | `src/lib/server/midtrans.ts:61,159-162` | ✅ |
| T2 | Tinggi | Entitlement fail-open: paket bulanan tanpa subscription aktif dianggap aktif tanpa batas; webhook cancel/expire tidak menurunkan `org.plan` | `src/lib/server/plan.ts:83-98`, `webhooks/midtrans/route.ts:132-149` | 🔴 Fail-closed; simpan masa berlaku di Organization; webhook menurunkan plan |
| T3 | Tinggi | Pengambilalihan `deviceId` mobile lintas tenant | `src/app/api/mobile/auth/login/route.ts:31-48`, `mobile/devices/register/route.ts:26-35`, `mobile/approvals/[id]/sign/route.ts:40-49`, `prisma/schema.prisma:345` | ✅ (lanjutan: deviceId sebaiknya dibuat server) |
| T4 | Tinggi | Secret JWT mobile jatuh ke `DATABASE_URL`/literal publik | `src/lib/server/mobile-auth.ts:15-18` | ✅ |
| T5 | Tinggi | Login mobile tanpa rate limit (kredensial sama dengan web); `scryptSync` memblok event loop | `mobile/auth/login/route.ts:7-28` | 🔴 Limiter per IP + per email, lockout progresif |
| T6 | Tinggi | Kunci rate limiter = IP paling kiri `X-Forwarded-For` (bisa dipalsukan), bucket bersama `"local"`, `Map` tak pernah dibersihkan | `src/lib/server/rateLimit.ts:7-22` | 🟠 Ambil IP dari hop proxy tepercaya; konfigurasi proxy perlu dicek |
| T7 | Tinggi | `ensureAdminUser` jalan juga di production saat tabel user kosong, dengan password default yang tertulis di README **dan ditampilkan di halaman login publik** | `src/lib/server/auth.ts:70-92`, `README.md:40`, `src/app/login/page.tsx:384-385` | 🔴 Nonaktifkan di production; hapus kredensial dari halaman login & README; endpoint ganti password |
| S3 | Sedang | `assertCanPublish` dipanggil di luar transaksi → Lite 24/25 + N request paralel = >25 dokumen | `quotations/route.ts:25`, `invoices/route.ts:38`, `payments/route.ts:35`, `mobile/payments/quick-record/route.ts:32` | 🔴 Hitung ulang kuota di dalam tx dengan lock baris org |
| S4 | Sedang | Total bayar dibaca sebelum lock → dua pembayaran paralel (web + mobile) bisa melebihi total invoice | `payments/route.ts:63-76`, `quick-record/route.ts:71-84` | 🔴 `SELECT … FOR UPDATE` baris invoice sebelum agregat (pola sama dengan perbaikan S4a) |
| S5 | Sedang | Challenge TTE memakai timestamp dari klien, tanpa nonce/kesegaran → signature bisa di-replay | `sign/route.ts:34,67`, `mobile/documents/[id]/route.ts:33-34` | 🔴 Nonce server sekali pakai, TTL ≤5 menit |
| S6 | Sedang | Sign/reject mobile melewati state machine web (draft→approved, approved→rejected) | `sign/route.ts:59-61,99-103`, `reject/route.ts:35-38` vs `quotations/[id]/route.ts:18-24` | 🔴 Pakai `TRANSITIONS` yang sama |
| S7 | Sedang | PIN tanpa lockout & tanpa validasi panjang | `sign/route.ts:79-83`, `devices/register/route.ts:15,24` | 🔴 |
| S8 | Sedang | Refresh token tidak dirotasi/di-revoke, tidak cek perangkat aktif | `mobile-auth.ts:120-145,166-171` | 🔴 |
| S9 | Sedang | SSRF lewat `smtpHost`/port bebas + pesan error dikembalikan | `delivery/settings/route.ts:35-36`, `src/lib/server/delivery.ts:66-75`, `delivery/test/route.ts:19-35` | 🔴 Blok IP privat setelah resolve, allowlist port |
| S10 | Sedang | `DELIVERY_ENC_KEY` jatuh ke turunan `DATABASE_URL` tanpa guard production | `src/lib/server/secret.ts:10-18` | 🔴 Wajib di production (pola sama T4) |
| S11 | Sedang | Halaman validasi publik mengembalikan baris DB mentah: `organizationId`, kontak PIC & NPWP klien, catatan internal pembayaran | `src/app/api/public/validate/[token]/route.ts:16,61,77,90-93` | 🔴 Serializer allowlist |
| S12 | Sedang | Webhook: cancel/expire menimpa status `active`; refund/chargeback diabaikan; cek idempotensi di luar tx | `webhooks/midtrans/route.ts:42-49,132-159` | 🔴 State machine + update bersyarat |
| R1 | Rendah | `AuditLog` & `DocumentSignatureLog` tanpa `organizationId`; dashboard mobile memfilter berdasarkan email aktor | `prisma/schema.prisma:279-290,364-381`, `mobile/dashboard/route.ts:38-43` | 🔴 **Prasyarat porting riwayat aktivitas** (lihat RENCANA_PORTING) |
| R2 | Rendah | Email semua tenant ke klien menyebut "PT. SMKarier Inovasi Digital" sebagai penerbit | `src/lib/server/deliver-doc.ts:56` | 🔴 Pakai `CompanySettings.name` tenant |
| R3 | Rendah | `orderId` memakai `Math.random` 5 karakter; `GET /api/subscription/[orderId]` publik tanpa limit (bocor nama pembeli); Snap dibuat sebelum baris DB | `checkout/route.ts:34-36,38-85`, `subscription/[orderId]/route.ts` | 🔴 `randomBytes`, insert pending dulu |
| R4 | Rendah | Batas bulan kuota mengikuti TZ server (container UTC → reset 07:00 WIB) | `plan.ts:35-36` | 🟠 Hitung eksplisit Asia/Jakarta |
| R5 | Rendah | Akun kedaluwarsa hanya diblok di 4 endpoint terbit (ubah status penawaran → auto-kirim tetap jalan) | `quotations/[id]/route.ts:26-72` | `OPEN` keputusan kebijakan read-only |
| R6 | Rendah | `usersLimit` paket tidak ditegakkan (belum ada fitur undang user — laten) | `src/lib/plans.ts:38,56,76` | 🔴 `assertCanAddUser` bersama fitur user management |
| R7 | Rendah | `simulateApproval` aktif bila `NODE_ENV≠production`; quick-record tanpa Zod; register membocorkan `err.message` | `sign/route.ts:84-88`, `quick-record/route.ts:35-47`, `register/route.ts:113` | 🔴 |
| R8 | Rendah | Bootstrap yang ditolak 401 dicatat "API tidak terjangkau — mode mock" dan masuk mode lokal (tersembunyi di balik redirect login) | `src/lib/store.tsx:118-128` | 🔴 Bedakan 401 dari jaringan putus |

**Isolasi per endpoint (ringkas).** Audit memetakan seluruh 34 route API (`VERIFIED-CODE`):

| Kelompok endpoint | Scoping `organizationId` | Catatan |
| --- | --- | --- |
| `clients`, `clients/[id]`, `quotations`, `quotations/[id]`, `invoices`, `payments`, `templates`, `templates/[id]`, `settings`, `delivery/*`, `bootstrap`, `auth/me`, `subscription/status` | ✅ Ya | Referensi silang (klien/penawaran/invoice org lain) ditolak 404. Kecurigaan awal tentang `templates/[id]` tidak terbukti: DELETE sudah cek org dulu |
| `mobile/approvals/*`, `mobile/documents/[id]`, `mobile/dashboard`, `mobile/payments/quick-record` | ✅ Ya (dokumen) | Perangkat: lihat T3 (✅). Dashboard: AuditLog per email (R1) |
| `public/validate/[token]` | ✅ token-scoped | Data terekspos berlebihan (S11) |
| `reset` | ❌ → ✅ | K2 |
| `subscription/checkout`, `simulated-pay`, `webhooks/midtrans` | ❌ → ✅ | K1, T1, T1b |
| `mobile/auth/login`, `mobile/devices/register` | ❌ → ✅ | T3 |
| Helper `snapshot.ts:18` `buildClientSnapshot`, `deliver-doc.ts:34` | 🟡 laten | `client.findUnique({id})` tanpa org; aman karena pemanggil sudah memvalidasi |

Unique constraint: nomor dokumen & kode klien sudah per-org (`@@unique([organizationId, number|code])`). Kolom yang masih global dan bermasalah adalah `DeviceSigner.deviceId` (T3). `User.email` global memang disengaja (1 email = 1 workspace).

### 3B. Kebenaran hitungan & keuangan (P0)

`calc.ts` NusaDoc **identik** dengan basis DocFlow `a875785` (0 baris beda, `VERIFIED-LOCAL` lewat diff). Karena itu temuan DocFlow B1–B8 berlaku utuh di NusaDoc.

| ID | Temuan | Bukti | Rekomendasi |
| --- | --- | --- | --- |
| B1 | Total termin bisa melebihi nilai kontrak karena harga satuan dibulatkan per baris per termin | `src/lib/calc.ts:52` `scaleItems`; DocFlow `VERIFIED-LOCAL`: 50/50 → lebih Rp10. Audit klaim menghitung 30/30/40 → +Rp21 dengan skrip yang meniru fungsi ini | Port B1 DocFlow: pelunasan = sisa rupiah kontrak |
| B2 | Invoice termin mencetak harga satuan yang sudah dipotong persentase | `calc.ts:52` | Port B2: format termin Ringkas/Rinci + kotak Posisi Termin |
| B3 | PPh 23 dihitung dari seluruh subtotal (termasuk barang) | `calc.ts:16` | Port B3: jenis item Barang/Jasa |
| B4 | Potongan PPh 23 dan biaya transfer tidak bisa dicatat → invoice "Sebagian" selamanya | Tidak ada field di `Payment` | Port B4: potongan pajak klien + No. bukti potong + biaya transfer |
| B5 | Invoice yang dibayar sebagian lalu lewat jatuh tempo tidak ditandai jatuh tempo | `calc.ts:27-33` | Port B5 |
| B6 | Tarif PPN statis 11%; tidak ada PPN 12% × DPP nilai lain 11/12 maupun klien pemungut | `calc.ts:13-17` | Port B6 (DocFlow: PMK 131/2024) |
| B7 | Tidak ada kotak meterai untuk kwitansi > Rp5 juta | Tidak ada di `ReceiptSheet` | Port B7. Pembeda Paper.id: e-Meterai Peruri. Kemitraan e-Meterai masuk Tahap 4 |
| B8 | Kartu "Diterima Bulan Ini" menulis jumlah kwitansi sepanjang masa | `src/app/(app)/dashboard/page.tsx:77` | Port B8 |
| T9/S4a | Termin ke-2/ke-3 gagal 500; cek ≤100% bisa diterobos paralel | `invoices/route.ts:94-106`, `sequence.ts:19-24` | ✅ diperbaiki sesi ini |
| S3/S4 | Race kuota dan overpayment paralel | §3A | 🔴 |

### 3C. Penghambat adopsi — lebih kaku daripada Word (P0 produk)

Sama dengan temuan DocFlow sebelum audit (`VERIFIED-CODE` di NusaDoc):

| ID | Temuan | Bukti |
| --- | --- | --- |
| A1 | Draft penawaran tidak bisa diedit; API hanya ubah status | `quotations/[id]/route.ts:30-52` |
| A2 | Tidak ada revisi maupun duplikat | Tidak ada `revision`/`rootId` di skema |
| A3 | Tidak ada diskon | `calc.ts:17` `discount: 0` |
| A4 | Tidak ada void/koreksi invoice & pembayaran | Tidak ada endpoint void |
| A5 | Edit klien tidak tersedia di layar (`updateClient` tidak dipakai halaman mana pun) | `src/lib/store.tsx` |
| A6 | Tidak ada field No. PO/SPK/kontrak & syarat terstruktur | `src/lib/types.ts` |
| A7 | Qty wajib bilangan bulat | `src/lib/server/validation.ts:18` |

### 3D. Klaim pemasaran & legal (P0 sebelum iklan)

Rujukan pasal adalah penilaian risiko awal, bukan nasihat hukum. Copy final sebaiknya dikonfirmasi ke konsultan.

| # | Klaim | Bukti | Masalah | Usulan copy jujur |
| --- | --- | --- | --- | --- |
| M1 | Rating 4,9 dari 128 ulasan di JSON-LD | `src/app/layout.tsx:124-128` | Tidak ada ulasan di sistem mana pun. Melanggar kebijakan structured data Google (risiko manual action) dan UUPK Ps. 9 | Hapus `aggregateRating` sampai ada ulasan nyata yang tampil di halaman |
| M2 | Hak Guna "terpasang di server Anda… milik selamanya", "garansi implementasi 90 hari uang kembali" | `src/lib/plans.ts:93,103,105`, `Landing.tsx:89,101,869` | Tidak ada paket instalasi, runbook self-host, maupun EULA. Checkout hanya menjadikan workspace cloud lifetime. Tidak ada syarat garansi (UUPK Ps. 26). Kata "milik" bertentangan dengan sifat lisensi "Hak Guna" | "Lisensi pemakaian tanpa batas waktu di server Anda; termasuk instalasi & pembaruan 12 bulan; hak cipta tetap milik PT SMKarier." Jual lewat "Hubungi kami" + halaman Syarat Garansi |
| M3 | "Tidak bisa dipalsukan", "anti-falsifikasi", "Bebas Kwitansi Palsu" | `layout.tsx:18,44,58`, `Landing.tsx:365,592` | Hash SHA-256 tanpa kunci disimpan di DB yang sama; nama penerbit/klien tidak ikut di-hash. Pemalsuan **terdeteksi**, bukan **mustahil** | "Kwitansi ber-QR yang keasliannya bisa dicek siapa pun" |
| M4 | "Kwitansi sah", "Dokumen Sah Kriptografis", "100% ASLI"; FAQ pajak menjawab "Ya" | `Landing.tsx:370,620,913,1045`, `InteractiveQrDemo.tsx:102,110`, `Landing.tsx:896-897` | Sah atau tidaknya bergantung pada isi dan para pihak. Kwitansi > Rp5 jt terutang bea meterai (UU 10/2020). Invoice ≠ Faktur Pajak | "Data cocok dengan arsip penerbit"; "NusaDoc menghitung PPN & PPh 23 pada invoice komersial — Faktur Pajak tetap dibuat di Coretax" |
| M5 | "Update otomatis di cloud & backup harian" | `plans.ts:84`, `Landing.tsx:83` | Tidak ada job backup maupun uji restore | Hapus sampai backup terjadwal + uji restore berjalan |
| M6 | "Menghemat 85% waktu administrasi", "100% presisi / nol selisih rupiah", "60 detik" | `Landing.tsx:663,387,551`, `DocumentSimulator.tsx:99,103` | Tidak ada data; selisih termin B1 justru ada | Hapus angka; "perhitungan termin otomatis" (setelah B1: "termin terakhir selalu pas rupiah") |
| M7 | "3 pengguna", "tambah Rp59 rb/user", "direksi menyetujui" | `plans.ts:82-83`, `Landing.tsx:82,97,577` | Tidak ada undang user, add-on, maupun role direksi | "Peran Admin/Finance/Sales/Viewer; penambahan pengguna dibantu tim kami" |
| M8 | "Akses akun akan dikirimkan ke email ini" | `CheckoutModal.tsx:194` | Checkout tamu tidak pernah membuat akun | ✅ diganti di sesi ini; checkout kini wajib login |
| M9 | Kredensial admin demo tampil di halaman login publik | `src/app/login/page.tsx:384-385` | Lihat T7 | Hapus |
| M10 | "Terkirim otomatis", "kirim PDF" | `Landing.tsx:567,619,909` | Delivery nonaktif secara default, tenant harus memasang SMTP/token sendiri, yang dikirim tautan (bukan PDF), dan gateway Fonnte/WaBlas bukan API resmi WhatsApp | "Kirim otomatis tautan dokumen via Email/WhatsApp setelah integrasi dikonfigurasi" |

Yang sudah benar: tidak ada klaim "TTE tersertifikasi" atau "setara meterai". Disclaimer bukan-PSrE sudah ada di `DocumentFooter.tsx:96`, `ValidateClient.tsx:105-106`, dan `pengaturan/page.tsx:192-194`. Bila TTE mobile dipasarkan, sebut sebagai **"persetujuan via biometrik/PIN perangkat terdaftar, beraudit — tanda tangan elektronik tidak tersertifikasi"**. Harga di landing, `plans.ts`, `midtrans.ts`, dan JSON-LD konsisten, dan kuota Lite 25 dokumen memang ditegakkan server (dengan catatan race S3).

### 3E. Yang sudah kuat — pertahankan dan tonjolkan

- **Isolasi data dokumen per tenant** konsisten di route web dan mobile, termasuk referensi silang.
- **Penomoran atomik per organisasi** (`{org}:QUO-YYYY-MM`, `FOR UPDATE`), nomor termin dari identitas penawaran.
- **Snapshot immutable + hash diverifikasi ulang server** di halaman QR publik; token 60-bit dari CSPRNG.
- **Kuota paket ditegakkan server** dengan 402 terstruktur (`plan.ts:136-157`), harga dari katalog server (bukan dari klien).
- **Signature webhook Midtrans** SHA-512 + `timingSafeEqual` sebelum ada tulisan ke DB; aktivasi di dalam transaksi.
- **Kredensial delivery AES-256-GCM** (IV acak, auth tag), tidak pernah dikembalikan ke klien; DeliverySettings per org.
- **Password scrypt**, cookie sesi HttpOnly/SameSite/Secure; refresh token mobile disimpan sebagai hash.
- **Test suite**: 75 → 110 test, termasuk test integration DB nyata yang membersihkan dirinya.

---

## 4. Visi: Reposisi Produk

### Dari → Ke

| | Visi saat ini (PRD) | Visi yang direkomendasikan |
| --- | --- | --- |
| Fokus | Membuat penawaran, invoice, dan kwitansi dengan QR | **Mengendalikan arus kas proyek** sampai uang masuk |
| Pertanyaan yang dijawab | "Bagaimana membuat dokumen rapi dan sah?" | "Uang proyek kita di mana, siapa yang harus ditagih, termin mana yang tertahan, berapa yang dipotong pajak?" |
| Pembeli | "UMKM & korporat" (terlalu luas) | Bisnis B2B berbasis proyek: kontraktor, system integrator, agensi, konsultan, vendor pengadaan |
| Pesaing di kepala pembeli | Word/Excel, Paper.id, Jurnal/Mekari, Accurate, Kledo | Sama, tetapi NusaDoc **tidak** bersaing di akuntansi atau payment gateway. NusaDoc menang di termin proyek, kepastian pajak, koreksi beraudit, verifikasi QR, dan penagihan, lalu mengekspor ke software akuntansi pelanggan |

### Pernyataan visi

> **NusaDoc memastikan setiap penawaran yang disetujui berubah menjadi uang masuk — tepat nilai, tepat waktu, dan bisa dibuktikan.**

Slogan: **"Dari penawaran sampai uang masuk."**

### Pilar

| Pilar | Janji | Bukti di produk (setelah porting) |
| --- | --- | --- |
| **Cepat** — lebih cepat dari Word | Revisi satu klik, duplikat, template, kirim WA/email dari layar | A1, A2, C1 + delivery NusaDoc |
| **Pasti** — lebih pasti dari Excel | Termin pas rupiah, PPh 23 hanya jasa, potongan pajak klien tercatat, nomor tak dobel | B1–B7, A4 |
| **Terkendali** — yang tidak bisa Word/Excel | Pusat penagihan, umur piutang, posisi proyek, rata-rata hari tagih | C2, C3, metrik |
| **Terbukti** — yang tidak bisa Paper.id | QR verifikasi + hash, koreksi beraudit, persetujuan direksi via HP | QR, void beraudit, TTE mobile (dengan framing jujur) |

### Menjawab keberatan pembeli

| Yang akan diucapkan | Jawaban produk |
| --- | --- |
| "Paper.id gratis dan ada link bayar" | NusaDoc bukan alat kirim invoice, tetapi pengendali termin proyek: posisi kontrak, sisa tagihan, dan potongan pajak per proyek. Integrasi link bayar bisa dibahas di Tahap 4 |
| "Jurnal/Accurate sudah ada invoice" | NusaDoc mengurus pra-akuntansi proyek (penawaran → termin → kwitansi) dan mengekspor ke akuntan (C4) |
| "Hitungannya selisih Rp10 dari kontrak" | Termin terakhir = sisa rupiah kontrak (B1) |
| "Klien potong PPh 23, invoice tidak pernah lunas" | Catat potongan + No. bukti potong saat bayar (B4) |
| "Mahal untuk sekadar bikin invoice" | Tunjukkan penurunan rata-rata hari tagih per workspace (§6) |

---

## 5. Roadmap Bertahap

Ukuran: **S** ≈ beberapa jam · **M** ≈ 1–3 hari · **L** ≈ > 3 hari. Rincian porting per fitur ada di [RENCANA_PORTING.md](./RENCANA_PORTING.md).

### Tahap 0 — "Aman dijual" (wajib sebelum iklan/go-live)

| Item | Ukuran |
| --- | --- |
| ✅ K1, K2, T1, T1b, T3, T4, T9, S4a, F1, F2 (sesi ini) | — |
| T7 admin default & kredensial di halaman login/README | S |
| T2 entitlement fail-closed + webhook menurunkan plan + S12 state machine webhook | M |
| T5 + T6 rate limit mobile & sumber IP tepercaya | M |
| S3 + S4 kuota dan pembayaran dikunci di dalam transaksi | M |
| S10 `DELIVERY_ENC_KEY` wajib di production; S11 serializer halaman publik | S |
| M1–M10 koreksi klaim pemasaran + Hak Guna dikeluarkan dari self-serve | M |
| Backup terjadwal + uji restore (atau hapus klaimnya) | M |

### Tahap 1 — "Jangan kalah dari Word" (porting DocFlow)

A5, B8, C10, B5, A7, A6, A3, A1, A2. Prasyarat: `AuditLog.organizationId` (R1).

### Tahap 2 — "Hitungan yang dipercaya finance" (porting DocFlow)

B1, B2, B3, B4, B7, A4, B6.

### Tahap 3 — "Alasan membayar"

C1 dengan delivery NusaDoc (WA aktif, bukan teaser), C5 riwayat aktivitas per org, C4 ekspor Excel per org, C3 posisi proyek, C2 pusat penagihan + **scheduler pengingat** (setting sudah ada, eksekusinya belum), metrik rata-rata hari tagih.

### Tahap 4 — Diferensiasi SaaS

User management + `usersLimit` (R6), onboarding terpandu, paket instalasi Hak Guna (Docker/runbook/EULA), white-label per tenant (logo, prefix nomor) — juga prasyarat strategi dua produk, e-Meterai (kemitraan Peruri/PSrE), link pembayaran untuk invoice tenant, ekspor format Jurnal/Accurate/Coretax, S5–S9 hardening TTE & delivery.

---

## 6. Metrik Keberhasilan

| Metrik | Arti | Target awal |
| --- | --- | --- |
| **Rata-rata hari tagih** (invoice terbit → lunas, per workspace) | **Metrik utama** — seberapa cepat uang pelanggan masuk | Turun dibanding baseline 3 bulan pertama tiap workspace |
| % invoice lunas sebelum jatuh tempo | Disiplin penagihan | Naik setiap bulan |
| Piutang > 60 hari (Rp) | Risiko macet | Turun |
| Selisih nilai termin vs kontrak | Kebenaran hitung | Rp0 |
| Aktivasi trial: workspace yang menerbitkan invoice termin pertama ≤ 7 hari | Nilai inti dirasakan | ≥ 40% |
| Konversi trial → berbayar | Kesehatan bisnis SaaS | Baseline dulu, lalu naik |
| Dokumen dibuat di luar aplikasi (laporan pelanggan) | Adopsi | 0 |
| Insiden lintas tenant / aktivasi tanpa bayar | Keamanan | 0 (dijaga test integration) |

---

## 7. Pertanyaan untuk Imam

Semua berstatus `OPEN`. Jawabannya menentukan urutan Tahap 0–4.

1. **Hak Guna:** apakah memang ada rencana paket instalasi on-premise, atau Hak Guna sebaiknya diganti menjadi "lisensi cloud seumur hidup"? Siapa yang menangani instalasi, dan apa isi EULA serta garansinya?
2. **Kuota:** apakah revisi penawaran, duplikat, dan invoice pengganti setelah void dihitung sebagai dokumen baru di paket Lite? (Usulan ada di RENCANA_PORTING §3.)
3. **Akun kedaluwarsa:** benar-benar read-only (semua write diblok), atau hanya penerbitan dokumen yang diblok (R5)?
4. **Environment:** di mana staging/production akan berjalan, dengan `NODE_ENV` apa, di belakang proxy apa, dan TZ apa? (Menentukan T6, R4, dan apakah K2 sempat terekspos.)
5. **Pembeli pertama:** segmen mana yang dibidik lebih dulu — kontraktor, system integrator, agensi, atau konsultan? Format pajak dan termin mereka berbeda.
6. **Paper.id:** apakah ada pelanggan atau calon yang sudah memakai Paper.id? Uji langsung fitur termin dan pajak mereka akan memperkuat atau melemahkan §2.
7. **Repo publik:** `imam-smkarier/nusadoc` berstatus PUBLIC. Apakah disengaja? Kode billing, mobile auth, dan riwayat yang memuat literal secret lama ikut terbaca publik.
8. **TTE mobile:** apakah akan dipasarkan? Bila ya, framing "tidak tersertifikasi" perlu disetujui dan S5–S8 masuk Tahap 0.
