# Cetak Biru Nusadoc Mobile (Flutter) & One-Tap Biometric Approval

> **Visi Produk:** Menjadikan Nusadoc sebagai **Market Leader** sistem dokumen komersial dan penagihan termin proyek di Indonesia melalui inovasi **Persetujuan & Tanda Tangan Biometrik (Face ID / Fingerprint / PIN) dalam satu genggaman**.

---

## 1. Masalah Pasar & Validasi Kebutuhan (The Real Unfair Advantage)

### Realitas Lapangan Bisnis di Indonesia
1. **Direktur / Pemilik Bisnis Jarang di Depan Laptop**:
   Pemilik bisnis, kontraktor, dan agensi 80% waktunya berada di lokasi proyek, meeting luar kantor, atau di perjalanan. Saat sales butuh persetujuan diskon atau finance butuh tanda tangan invoice termin, proses macet berjam-jam hingga berhari-hari.
2. **Budaya Tanda Tangan Coretan via WhatsApp yang Berbahaya**:
   Praktik umum saat ini: admin mengirim draf dokumen ke WA bos, bos mengirim foto/PNG tanda tangan coretan di atas kertas, lalu admin menempelkan gambar tersebut ke dokumen Word/Excel.
   - **Risiko fatal**: Gambar tanda tangan direksi bisa disalin dan disalahgunakan oleh staf/oknum untuk dokumen fiktif.
   - **Audit trail nol**: Tidak ada bukti kriptografis siapa, kapan, dan dari perangkat mana dokumen disetujui.
3. **Kompetitor Terlalu Kaku & Berat**:
   Software akuntansi seperti Jurnal Mekari atau Accurate berorientasi pada akuntansi rumit (jurnal debit-kredit, stok opname). Direktur tidak punya waktu membuka modul akuntansi hanya untuk menandatangani 1 penawaran proyek.

### Solusi Nusadoc Mobile
**"One-Tap Biometric Approval & Cryptographic Seal"**
> Direktur menerima push notification di smartphone → membuka rincian dokumen dalam 2 detik → menggeser tombol *Swipe to Sign* → verifikasi Face ID / Sidik Jari → dokumen sah terbit seketika dengan stempel digital ber-audit trail lengkap dan terkirim otomatis ke WhatsApp/Email klien.

---

## 2. Business Flow & Protokol Kriptografi Persetujuan Mobile

```
[Sales/Finance Web]                [Backend Nusadoc]                  [Direktur Mobile App]
       │                                   │                                    │
       ├── 1. Minta Approval Direktur ────>│                                    │
       │   (Quotation / Invoice)           ├── 2. Push Notif FCM ──────────────>│
       │                                   │   "PT Global — Rp 59,9 Jt"         │
       │                                   │                                    ├── 3. Buka Notif &
       │                                   │                                    │      Review Rincian
       │                                   │                                    │
       │                                   │                                    ├── 4. Swipe to Sign
       │                                   │                                    │      + FaceID / PIN
       │                                   │<── 5. Kirim Signature Proof ───────┤
       │                                   │   (Kunci privat Secure Enclave)    │
       │                                   ├── 6. Verifikasi Public Key         │
       │                                   │      + Sematkan Segel Digital      │
       │                                   │      + Update Status (APPROVED)    │
       │<── 7. WebSocket / Auto Refresh ───┤                                    │
       │   (Status berubah HIJAU SAH)      ├── 8. Auto-send WA/Email ke Klien ──>
```

### Protokol Keamanan Tingkat Perbankan (Zero-Trust Keypair)
1. **Pendaftaran Perangkat (Enrollment)**:
   - Saat direktur login pertama kali di aplikasi Flutter, aplikasi membuat pasangan kunci kriptografi **ECDSA (secp256r1 / P-256)** di dalam chip keamanan hardware smartphone (**Apple Secure Enclave** pada iOS, **Android Hardware Keystore** pada Android).
   - **Kunci Privat (Private Key)** berada di chip fisik dan **TIDAK PERNAH DAPAT DIEKSTRAK** oleh aplikasi atau sistem operasi.
   - Kunci privat hanya dapat dipicu untuk menandatangani data jika sensor biometrik (Face ID / Touch ID / Fingerprint) atau Secure PIN 6-digit berhasil diverifikasi oleh hardware OS.
   - **Kunci Publik (Public Key)** dikirim dan didaftarkan ke server Nusadoc.
2. **Proses Penandatanganan (Signing Event)**:
   - Server mengirim *Challenge Token* (mencakup hash kanonik SHA-256 dokumen + timestamp + nonce).
   - Direktur menggeser slider *Swipe to Sign*. Prompt Face ID / Sidik Jari OS muncul.
   - Chip Secure Enclave menandatangani challenge token dengan private key.
   - Aplikasi mengirim *Signature Proof* beserta metadata (Device ID, IP, Geolocation, Biometric Type).
   - Server memverifikasi signature menggunakan Public Key terdaftar.
   - Begitu valid, status dokumen berganti menjadi `approved` (atau `issued`), snapshot dokumen dikunci, dan stempel digital resmi disematkan.

---

## 3. Peta Upgrade Backend untuk Mendukung Mobile

### A. Skema Database Tambahan (Prisma)

```prisma
/// Pendaftaran perangkat mobile yang sah untuk penandatanganan dokumen
model DeviceSigner {
  id             String    @id
  userId         String
  deviceId       String    @unique // UUID unik perangkat
  deviceName     String    // mis. "iPhone 15 Pro Max" / "Samsung S24 Ultra"
  publicKey      String    @db.Text // Public Key ECDSA P-256 (Base64)
  fcmToken       String?   @db.Text // Token Push Notification Firebase
  biometricType  String    // face_id | fingerprint | pin
  pinHash        String?   // Hash scrypt PIN cadangan
  isActive       Boolean   @default(true)
  lastUsedAt     DateTime?
  createdAt      DateTime  @default(now())

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  signatures     DocumentSignatureLog[]

  @@index([userId])
}

/// Jejak audit hukum setiap tanda tangan/persetujuan yang terjadi
model DocumentSignatureLog {
  id             String       @id
  documentType   String       // quotation | invoice
  documentId     String
  signerId       String
  signatureProof String       @db.Text // Tanda tangan kriptografis Base64
  biometricType  String       // face_id | fingerprint | pin
  deviceInfo     String       // OS, Model, App Version
  ipAddress      String
  latitude       Float?
  longitude      Float?
  signedAt       DateTime     @default(now())

  signer         DeviceSigner @relation(fields: [signerId], references: [id], onDelete: Cascade)

  @@index([documentType, documentId])
  @@index([signedAt])
}
```

### B. Endpoints REST API Mobile (`/api/mobile/*`)
1. `POST /api/mobile/auth/login`: Otentikasi dual-mode (mengembalikan JWT Access Token masa aktif 15 menit + Refresh Token 30 hari di Secure Storage).
2. `POST /api/mobile/devices/register`: Mendaftarkan Public Key dan token FCM perangkat.
3. `GET /api/mobile/approvals/pending`: Mengambil daftar dokumen yang membutuhkan persetujuan direksi/approver.
4. `GET /api/mobile/documents/:id`: Mengambil rincian dokumen lengkap beserta snapshot item dan status kalkulasi.
5. `POST /api/mobile/approvals/:id/sign`: Memverifikasi payload kriptografis tanda tangan dari Secure Enclave dan mengeksekusi persetujuan dokumen.
6. `POST /api/mobile/approvals/:id/reject`: Menolak dokumen dengan alasan revisi tertulis yang langsung muncul di dashboard sales.
7. `POST /api/mobile/payments/quick-record`: Mencatat pembayaran instan dan menerbitkan kwitansi langsung dari smartphone.

### C. Infrastruktur Pendukung
- **Firebase Cloud Messaging (FCM)**: Pengiriman push notification instan ke perangkat mobile saat ada dokumen baru.
- **WebSocket / Server-Sent Events (SSE)**: Sinkronisasi status instan di dashboard web sales tanpa perlu refresh halaman saat direktur menyetujui di HP.

---

## 4. Konsep UI/UX Mobile (Flutter)

### Desain Sistem & Ergonomi
- **Palette**: Navy `#0b2341`, Blue `#087ed4`, Accent Orange `#f97316`, Surface Canvas `#f4f7fa`.
- **Typography**: Inter (data & teks) + Space Grotesk (angka & judul).
- **Haptic Feedback**: Getaran mikro haptic saat slider ditarik, dan haptic konfirmasi mantap saat biometrik berhasil.
- **Thumb-Zone Accessibility**: Semua tombol navigasi dan aksi tanda tangan diposisikan di 40% area bawah layar agar nyaman dioperasikan dengan satu tangan saat berjalan.

### 4 Layar Utama Aplikasi Flutter

#### Layar 1: Executive Command Center (Dashboard)
- **Ringkasan Kas Cepat**:
  - Saldo Piutang Aktif (Outstanding)
  - Penerimaan Uang Masuk Bulan Ini
  - Tagihan Jatuh Tempo Minggu Ini
- **Hero Alert Card — "Menunggu Persetujuan Anda"**:
  - Kartu ber-aksen oranye hangat jika ada penawaran bernilai tinggi yang tertahan.
  - Menampilkan nama klien, nilai rupiah, dan nama sales pengaju.
- **Quick Action Dock**:
  - Pindai QR Dokumen Fisik
  - Catat Pembayaran Cepat
  - Buat Penawaran Instan

#### Layar 2: Document Inspection & Swipe-to-Sign (Layar Persetujuan)
- Lembar dokumen A4 yang dirampingkan untuk layar ponsel (tabel item collapsible, rincian PPN 11%, nilai total, syarat garansi).
- Badge integritas: `🔒 Hash Dokumen Terkunci SHA-256`.
- **Komponen Interaktif "Swipe to Sign"**:
  - Slider horizontal berwarna biru laut: *"Geser untuk Menyetujui & TTD"*.
  - Saat digeser penuh ke kanan: Sheet Biometrik OS (Face ID / Fingerprint) muncul seketika.
  - Stempel Segel Resmi beranimasi dan menempel di dokumen: *"Disetujui secara Digital oleh [Nama Direktur] · 01 Okt 2026 14:32 WIB"*.

#### Layar 3: Quick Payment Collector
- Dirancang untuk finance & direktur saat mengecek mutasi mobile banking:
  - Pilih invoice klien yang belum lunas.
  - Masukkan nominal dana masuk.
  - Klik "Terbitkan Kwitansi" → Kwitansi sah langsung terbit dengan nomor urut atomik `NSD/KWT/...`.
  - Tombol 1-klik: "Kirim Kwitansi Resmi via WhatsApp Klien".

#### Layar 4: Scanner QR Kamera 60 FPS
- Menggunakan kamera native berkecepatan tinggi.
- Arahkan ke QR pada invoice atau kwitansi fisik di meja meeting klien → langsung menampilkan status keaslian hijau, nama perusahaan penerbit, dan nominal tanpa perlu membuka web browser.

---

## 5. Strategi Penjualan & Go-To-Market (Market Leader Playbook)

### A. Positioning Menghabisi Kompetitor (Competitive Moat)

| Parameter | Software Akuntansi Konvensional (Jurnal / Paper / Accurate) | Nusadoc (Web + Mobile Biometric TTE) |
| :--- | :--- | :--- |
| **Fokus Produk** | Buku besar rumit, jurnal akuntansi, stok gudang | **Spesialis Dokumen Penagihan Komersial & Termin Proyek** |
| **Waktu Belajar Tim** | 2–4 minggu (butuh staf accounting berpengalaman) | **3 Menit (siapa saja langsung bisa pakai)** |
| **Multi-Termin Proyek** | Kaku, rawan selisih hitung manual per invoice | **Native carry-over (DP, progres, retensi terkunci 100%)** |
| **Persetujuan Direksi** | Harus login web laptop atau manual via chat WA | **1-Tap Biometric Swipe di HP (FaceID / Sidik Jari)** |
| **Validasi Anti-Palsu** | PDF biasa (sangat mudah diedit di Canva/Photoshop) | **QR Publik + Hash Kriptografi SHA-256 tidak bisa dipalsukan** |
| **Model Pembelian** | Iuran bulanan mahal per-pengguna | **Tersedia Hak Guna On-Premise Sekali Bayar Selamanya** |

### B. Product-Led Viral Growth Loop (Setiap Transaksi Mengakuisisi Pengguna Baru)
1. Setiap Penawaran, Invoice, dan Kwitansi yang dikirimkan oleh pengguna Nusadoc ke klien mereka membawa footer resmi:
   `🛡️ Dokumen Sah Terverifikasi SHA-256 · Powered by Nusadoc`
2. Klien B2B (yang juga pemilik bisnis, kontraktor, atau manajer keuangan) memindai QR untuk memeriksa keabsahan dokumen.
3. Mereka terkesan dengan tampilan verifikasi yang begitu rapi, modern, dan kredibel.
4. Di halaman verifikasi terdapat tombol soft-conversion:
   *"Ingin sistem dokumen dan penagihan proyek perusahaan Anda seprofesional ini? Coba Nusadoc Gratis"*.
5. **Customer Acquisition Cost (CAC) mendekati Rp 0** karena setiap dokumen yang beredar berfungsi sebagai sales ambassador Nusadoc.

### C. Strategi Penetrasi Segmen Vertikal

#### Gelombang 1: Kontraktor, System Integrator, & Desain Interior / Arsitek
- **Sakit Hati Terbesar**: Pembayaran termin proyek (DP 30%, termin 1, termin 2, retensi) dihitung manual di Excel, sering salah hitung pajak, dan uang telat cair berminggu-minggu.
- **Pesan Kampanye**: *"Hentikan Selisih Termin Proyek di Excel. Tagih Rapi, Approve Lewat HP, Cair Tepat Waktu."*

#### Gelombang 2: Software House, Agensi Kreatif & Event Organizer
- **Sakit Hati Terbesar**: Founder/direktur sibuk meeting di lapangan, tim sales menunda kirim penawaran karena menunggu approval bos.
- **Pesan Kampanye**: *"Tutup Deal Proyek Sebelum Prospek Dingin. Setujui Penawaran Harga Kapan Saja Cukup dengan Sidik Jari."*

#### Gelombang 3: Distributor, Supplier Bahan Baku, & Bisnis B2B
- **Sakit Hati Terbesar**: Piutang menggantung, sungkan menagih klien, dan kwitansi rawan dipalsukan oknum salesman.
- **Pesan Kampanye**: *"Sistem Dokumen Anti-Falsifikasi. Pengingat Jatuh Tempo Otomatis ke WhatsApp Klien."*

### D. Skema Harga & Monetisasi
- **Paket Bulanan (Cloud SaaS)**: Rp 249.000 / bulan (termasuk akses Web + Mobile Companion untuk Direksi & Finance).
- **Paket Hak Guna (On-Premise)**: Rp 19.900.000 sekali bayar selamanya (sistem terpasang di VPS perusahaan + mobile app terhubung ke API server internal mereka).
- **Keunggulan Mobile Sebagai Daya Tarik Penjualan**: Fitur persetujuan biometrik di HP menjadi alasan emosional terkuat mengapa pemilik bisnis bersedia membayar: **mereka mendapatkan ketenangan dan kendali penuh atas uang bisnis mereka di mana pun mereka berada.**
