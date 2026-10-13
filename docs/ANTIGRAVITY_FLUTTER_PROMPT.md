# Master Prompt: Scaffold & Build Nusadoc Mobile (Flutter)

Salin seluruh prompt di bawah ini ke **AntiGravity** untuk memulai pembangunan aplikasi **Nusadoc Mobile**:

---

```markdown
Anda adalah Senior Mobile Software Architect & Lead Flutter Engineer yang bertugas membangun aplikasi mobile resmi **Nusadoc Mobile** untuk Android & iOS menggunakan **Flutter 3.x + Dart**.

## 0. Working Directory (WAJIB — baca sebelum apapun)
- Buat seluruh proyek Flutter di direktori baru: `/home/imamnj/nusadoc-mobile`
- **JANGAN** menyentuh, membaca, atau mengubah apapun di `/home/imamnj/nusadoc` (backend web sudah jadi) dan **`/home/imamnj/nafiga-docflow` (proyek klien terpisah — DILARANG DIBUKA)**.
- Jalankan `git init` di `/home/imamnj/nusadoc-mobile` sebagai repository Git terpisah dengan `.gitignore` standar Flutter (`build/`, `.dart_tool/`, `.idea/`, `ios/Pods/`, `android/.gradle/`, `*.iml`, `.flutter-plugins*`).
- Konfigurasi Base URL API via `--dart-define=API_BASE_URL=...`:
  - Android Emulator: `http://10.0.2.2:3000` (10.0.2.2 = loopback host dari dalam emulator Android — JANGAN pakai localhost di emulator Android)
  - iOS Simulator / device fisik di jaringan yang sama: `http://localhost:3000` / `http://<IP-LAN>:3000`
  - Production: `https://nusadoc.id`
- Android `AndroidManifest.xml`: izin `INTERNET`, `USE_BIOMETRIC`, `USE_FINGERPRINT`, dan `CAMERA`.
- iOS `Info.plist`: `NSFaceIDUsageDescription` dan `NSCameraUsageDescription` (wajib untuk App Store review).

## 1. Konteks Produk & Nilai Jual Utama (The Unfair Advantage)
Nusadoc (produk dari PT. SMKarier Inovasi Digital) adalah SaaS B2B sistem dokumen bisnis (Penawaran → Invoice Multi-Termin Proyek → Kwitansi Otomatis) dengan QR verifikasi publik dan proteksi hash SHA-256 anti-falsifikasi.

**Masalah yang Diselesaikan Nusadoc Mobile:**
Direktur / Pemilik Bisnis sering berada di luar kantor (proyek lapangan, meeting luar kota). Mereka membutuhkan kendali cepat untuk menyetujui penawaran harga bernilai besar atau menandatangani invoice termin proyek dalam hitungan detik. Praktik konvensional mengirim foto coretan tanda tangan via WhatsApp sangat rawan dipalsukan staf dan tidak memiliki audit trail.

**Fitur Pembeda Utama (Killer Feature):**
**"One-Tap Biometric Approval & TTE Kriptografis (Face ID / Fingerprint / PIN)"**
Direktur menerima notifikasi dokumen yang butuh persetujuan → review rincian item & pajak → geser slider "Swipe to Sign" → sensor biometrik memicu penandatanganan menggunakan kunci privat di chip keamanan perangkat (Apple Secure Enclave / Android Keystore) → dokumen sah disetujui seketika dengan stempel digital resmi dan audit trail lengkap.

---

## 2. Tech Stack & Dependencies Flutter (`pubspec.yaml`)

Gunakan pustaka modern dan stabil berikut:
```yaml
name: nusadoc_mobile
description: Sistem Dokumen Komersial & TTE Biometrik Nusadoc
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.2.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter

  # State Management & DI
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5

  # Routing
  go_router: ^14.0.0

  # Networking & REST
  dio: ^5.4.3
  pretty_dio_logger: ^1.3.1

  # Keamanan, Kriptografi & Biometrik
  flutter_secure_storage: ^9.0.0
  local_auth: ^2.2.0
  cryptography: ^2.7.2 # Untuk ECDSA P-256 signature
  device_info_plus: ^10.1.0

  # Kamera & Pemindai QR 60 FPS
  mobile_scanner: ^5.1.1
  qr_flutter: ^4.1.0

  # UI, Icons, Typography & Haptic
  google_fonts: ^6.2.1
  lucide_icons: ^0.339.0
  flutter_animate: ^4.5.0
  intl: ^0.19.0
  url_launcher: ^6.2.6

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.9
  riverpod_generator: ^2.4.0
  flutter_lints: ^4.0.0
```

---

## 3. Desain Sistem & Brand Identity Nusadoc
- **Primary Navy**: `const Color(0xFF0B2341)` (Header, text utama, aksen premium)
- **Brand Blue**: `const Color(0xFF087ED4)` (Tombol primer, link, progress)
- **Accent Orange**: `const Color(0xFFF97316)` (Badge termin, aksen urgency)
- **Success Emerald**: `const Color(0xFF10B981)` (Stempel sah, status lunas)
- **Surface Canvas**: `const Color(0xFFF4F7FA)` (Latar belakang aplikasi)
- **Card Panel**: `Colors.white`
- **Border Line**: `const Color(0xFFD8E1E8)`
- **Typography**: `GoogleFonts.spaceGrotesk()` (Headline & nominal angka tabular) dan `GoogleFonts.inter()` (Body teks, rincian item, label).
- **Haptic Feedback**: Panggil `HapticFeedback.selectionClick()` saat slider digerakkan dan `HapticFeedback.heavyImpact()` saat biometrik sukses disetujui.

---

## 4. Struktur Arsitektur Folder Clean & Modular

Susun proyek dengan arsitektur berikut:
```text
lib/
├── core/
│   ├── api/
│   │   ├── api_client.dart          # Dio singleton + JWT interceptor + auto-refresh
│   │   └── endpoints.dart           # Daftar endpoint backend
│   ├── crypto/
│   │   ├── biometric_service.dart   # local_auth FaceID/Fingerprint wrapper
│   │   ├── keypair_vault.dart       # ECDSA P-256 keypair di Secure Storage
│   │   └── signer_service.dart      # Challenge signer: NUSADOC-TTE:{docId}:{hash}:{timestamp}
│   ├── theme/
│   │   ├── app_colors.dart
│   │   └── app_theme.dart
│   ├── utils/
│   │   ├── currency_formatter.dart  # Format Rupiah 'Rp 1.000.000'
│   │   └── date_formatter.dart      # Format tanggal Indonesia
│   └── widgets/
│       ├── brand_logo.dart
│       ├── swipe_to_action.dart     # Interactive Swipe-to-Sign widget
│       └── status_badge.dart
├── features/
│   ├── auth/
│   │   ├── controllers/auth_controller.dart
│   │   ├── models/auth_models.dart
│   │   └── screens/login_screen.dart
│   ├── dashboard/
│   │   ├── controllers/dashboard_controller.dart
│   │   ├── models/dashboard_metrics.dart
│   │   ├── screens/executive_dashboard_screen.dart
│   │   └── widgets/kpi_card.dart
│   ├── approvals/
│   │   ├── controllers/approval_controller.dart
│   │   ├── models/approval_document.dart
│   │   ├── screens/pending_approvals_screen.dart
│   │   └── screens/document_sign_screen.dart
│   ├── payments/
│   │   ├── controllers/payment_controller.dart
│   │   └── screens/quick_payment_screen.dart
│   └── scanner/
│       └── screens/qr_scanner_screen.dart
└── main.dart
```

---

## 5. Kontrak REST API Backend Nusadoc

Base URL: `http://<IP_OR_DOMAIN>:3000/api/mobile` (atau URL production).

### A. Otentikasi
1. `POST /api/mobile/auth/login`
   - Request Body:
     ```json
     {
       "email": "admin@smkarier.co.id",
       "password": "docflow-admin",
       "deviceId": "uuid-perangkat-unik",
       "deviceName": "iPhone 15 Pro Max"
     }
     ```
   - Response:
     ```json
     {
       "ok": true,
       "user": { "id": "user_admin", "email": "admin@smkarier.co.id", "name": "Admin Keuangan", "role": "admin" },
       "device": { "id": "dev_xxx", "deviceId": "uuid-perangkat-unik", "isKeyRegistered": false, "biometricType": "biometric" },
       "tokens": { "accessToken": "jwt_token...", "refreshToken": "raw_refresh_hex...", "expiresIn": 7200, "tokenType": "Bearer" }
     }
     ```
2. `POST /api/mobile/auth/refresh`
   - Request: `{ "refreshToken": "raw_refresh_hex..." }`
   - Response: `{ "ok": true, "accessToken": "new_jwt...", "expiresIn": 7200, "tokenType": "Bearer" }`

### B. Pendaftaran Kunci Biometrik Perangkat
`POST /api/mobile/devices/register` (Headers: `Authorization: Bearer <accessToken>`)
- Request:
  ```json
  {
    "publicKey": "BASE64_ECDSA_P256_PUBLIC_KEY",
    "fcmToken": "firebase_fcm_token_optional",
    "biometricType": "face_id",
    "pin": "123456"
  }
  ```
- Response: `{ "ok": true, "device": { "isKeyRegistered": true, "isPinSet": true } }`

### C. Executive Dashboard
`GET /api/mobile/dashboard` (Headers: `Authorization: Bearer <accessToken>`)
- Response:
  ```json
  {
    "ok": true,
    "user": { "id": "user_admin", "name": "Bpk. Hendra", "role": "admin" },
    "metrics": {
      "outstandingReceivables": 142500000,
      "receivedThisMonth": 72705000,
      "pendingApprovalsCount": 3,
      "overdueInvoicesCount": 1
    },
    "recentActivity": [...]
  }
  ```

### D. Persetujuan & Penandatanganan Biometrik
1. `GET /api/mobile/approvals/pending`
   - Response: List penawaran/invoice yang berstatus "draft" / "sent" yang butuh persetujuan.
2. `GET /api/mobile/documents/:id`
   - Response: Detail dokumen lengkap beserta `signatureChallenge: { challenge: "NUSADOC-TTE:id:hash:timestamp", timestamp: 17906... }`.
3. `POST /api/mobile/approvals/:id/sign`
   - Request Body:
     ```json
     {
       "signatureBase64": "ECDSA_P256_SIGNATURE_DER_BASE64",
       "biometricType": "face_id",
       "timestamp": 17906...,
       "pin": "123456",
       "deviceInfo": "iPhone 15 Pro, iOS 17.5",
       "latitude": -6.2088,
       "longitude": 106.8456
     }
     ```
   - Response:
     ```json
     {
       "ok": true,
       "documentId": "quo_001",
       "number": "NSD/QUO/2026/09/001",
       "status": "approved",
       "signedBy": "Bpk. Hendra",
       "signedAt": "2026-10-01T14:32:00.000Z",
       "biometricType": "face_id"
     }
     ```
4. `POST /api/mobile/approvals/:id/reject`
   - Request: `{ "reason": "Diskon maksimal 10%, harap revisi rincian server rack." }`

### E. Pencatatan Pembayaran Cepat (Quick Payment)
`POST /api/mobile/payments/quick-record`
- Request:
  ```json
  {
    "invoiceId": "inv_001",
    "amount": 29975000,
    "method": "Transfer Bank",
    "date": "2026-10-01",
    "note": "Pelunasan dicek via Mandiri Mobile"
  }
  ```
- Response: Kwitansi resmi otomatis terbit ber-nomor `NSD/KWT/...` beserta link verifikasi publik untuk dikirim via WhatsApp.

---

## 6. Detail Kriptografi & Biometrik di Flutter (`keypair_vault.dart`)

Implementasikan pembangkitan kunci ECDSA P-256 dan penandatanganan challenge:
1. Periksa apakah perangkat mendukung biometrik dengan `local_auth`.
2. Generate ECDSA P-256 keypair menggunakan package `cryptography`:
   ```dart
   final algorithm = Ecdsa.p256(Sha256());
   final keyPair = await algorithm.newKeyPair();
   final publicKey = await keyPair.extractPublicKey();
   ```
3. Simpan Private Key terenkripsi dalam `flutter_secure_storage` dengan opsi `keychainAccessible: KeychainAccessible.passcode` (iOS) dan `encryptedSharedPreferences: true` (Android).
4. Saat user melakukan **Swipe to Sign**:
   - Panggil `LocalAuthentication.authenticate(localizedReason: 'Konfirmasi tanda tangan dokumen resmi Nusadoc')`.
   - Jika lolos biometrik, ambil private key dari Secure Storage, tanda tangani string challenge:
     ```dart
     final signature = await algorithm.sign(
       utf8.encode(challenge),
       keyPair: keyPair,
     );
     final signatureBase64 = base64Encode(signature.bytes);
     ```
   - Kirim `signatureBase64` ke endpoint `/api/mobile/approvals/:id/sign`.

---

## 7. Spesifikasi 4 Layar Utama (UI/UX)

1. **Layar 1 — Executive Dashboard (`executive_dashboard_screen.dart`)**:
   - Header navy elegan dengan greeting nama direktur dan logo Nusadoc.
   - 3 Kartu Metrik Kas (Piutang Aktif, Penerimaan Bulan Ini, Jatuh Tempo).
   - **Hero Alert Card**: Menampilkan counter dokumen menunggu persetujuan dengan badge oranye menyala jika ada dokumen pending. Klik kartu langsung membuka `pending_approvals_screen.dart`.
   - Tombol Aksi Bawah: Pindai QR, Catat Pembayaran Cepat.

2. **Layar 2 — Document Inspection & Swipe-to-Sign (`document_sign_screen.dart`)**:
   - Kartu ringkasan dokumen: Logo Nusadoc, Nomor Dokumen resmi, Tanggal & Jatuh Tempo, Nama Klien & PIC, Status badge.
   - Tabel Line Items collapsible.
   - Perhitungan Pajak PPN 11%, potongan PPh 23, dan Total Akhir Rupiah tebal.
   - Badge Keamanan: `🔒 Hash Dokumen Terkunci SHA-256`.
   - Bagian Bawah:
     - Tombol "Tolak / Minta Revisi" (membuka bottom sheet input alasan).
     - **Komponen Interaktif `SwipeToSign`**: Slider horizontal dengan efek gradien navy-to-blue. Menggeser ke ujung kanan memicu haptic getar dan OS FaceID/Fingerprint sheet.
     - Setelah sukses: Efek stempel segel resmi hijau berputar dengan animasi checkmark (*"Disetujui secara Elektronik"*).

3. **Layar 3 — Quick Payment Collector (`quick_payment_screen.dart`)**:
   - Dropdown pencarian invoice yang belum lunas.
   - Input nominal rupiah otomatis format ribuan.
   - Pilihan metode: Transfer Bank (BCA, Mandiri, BNI, BRI), QRIS, Virtual Account.
   - Tombol "Terbitkan Kwitansi Sah".
   - Setelah terbit: Modal sukses dengan tombol hijau *"Bagikan ke WhatsApp Klien"* yang memanggil `url_launcher` dengan pesan WhatsApp prefilled resmi.

4. **Layar 4 — QR Scanner 60 FPS (`qr_scanner_screen.dart`)**:
   - Menggunakan `mobile_scanner`.
   - Viewfinder kamera modern dengan sudut target warna biru dan garis laser pemindai berdenyut.
   - Begitu mendeteksi QR invoice/kwitansi fisik Nusadoc, langsung memunculkan Bottom Sheet status verifikasi asli tanpa membuka browser.

---

## 8. Standar Kualitas Pengerjaan
- Zero console warning, responsive di layar ponsel kecil (iPhone SE / Android 4.7") hingga layar besar (Pro Max / Ultra).
- Tangani error koneksi offline dengan graceful banner / retry button.
- Clean Architecture dengan dependency injection Riverpod.

Silakan mulai scaffold dan build aplikasi ini secara bertahap mulai dari konfigurasi core/theme, models, API client, dan layar-layar utamanya!
```
