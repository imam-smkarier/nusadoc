# Sustainable Development Workflow & Agent Rules

> Dokumen ini adalah kontrak kerja untuk manusia, model AI, agent, harness, dan tool apa pun yang mengembangkan Nafiga DocFlow setelah sesi ini. Tujuannya: menjaga integritas finansial, mengurangi context loss, serta mencegah perubahan perilaku diam-diam.

## 1. Urutan Membaca Wajib

Sebelum mengubah code, setiap contributor/agent **wajib** membaca dalam urutan ini:

1. `AGENTS.md` — ringkasan proyek dan boundary teknis.
2. `docs/CURRENT_STATE.md` — fakta fase sekarang dan blocker production.
3. `docs/PRD.md` — aturan bisnis dan acceptance criteria.
4. Dokumen ini — proses, quality gate, dan definisi selesai.
5. File code yang akan diubah beserta test terkait.

Jika ada kontradiksi, urutan otoritasnya:

```text
Keputusan user eksplisit saat ini
→ PRD (aturan produk)
→ CURRENT_STATE (fakta implementasi)
→ AGENTS (petunjuk kode)
→ README (onboarding)
```

Jangan menganggap behavior implementasi saat ini sebagai keputusan produk kalau tidak ada di PRD.

---

## 2. Prinsip Tidak Bisa Dilanggar

1. **Kebenaran finansial mengalahkan kenyamanan UI.** Status, jumlah, termin, nomor, token, dan hash harus bisa diverifikasi di server.
2. **Tidak ada perubahan alur dokumen diam-diam.** Alur Client → Quote → Invoice → Payment → Receipt, serta carry-over, wajib dipertahankan.
3. **Dokumen turunan selalu menyebutkan induk.** Jangan menghapus referensi Quote di Invoice atau Invoice di Receipt.
4. **Kwitansi final.** Jangan buat edit/delete normal untuk kwitansi tanpa desain void/reissue dan audit trail.
5. **Tidak ada secret dalam Git, log, prompt, atau dokumentasi.** `.env`, token, password, private key, dan connection string asli dilarang dibaca/ditampilkan/di-commit.
6. **Production read-only tanpa otorisasi eksplisit.** Gunakan local development dan CI untuk perubahan; jangan `db push --force-reset` ke production.
7. **Status invoice kalkulatif.** Tidak ada field/API UI yang membiarkan admin memilih status Invoice manual.
8. **Print hemat tinta.** Jangan memperkenalkan blok background gelap luas atau `print-color-adjust: exact` pada sheet dokumen.

---

## 3. Workflow Perubahan

### 3.1 Triage

| Jenis kerja | Langkah minimum |
| --- | --- |
| Copy/UI kecil | Baca komponen target → implementasi → browser check → build |
| Bug | Reproduksi → cek runtime/API/DB → isolasi akar masalah → fix → regression test |
| Perubahan workflow bisnis | Baca PRD → proposal/perjelas keputusan bila ambigu → update PRD + code + progress log |
| Schema/API | Desain data/migration → auth/validation/integrity → implementation → test DB/API → build |
| Deployment | Cek CURRENT_STATE production blockers → gunakan Git/CI → jangan gunakan kredensial atau host raw |

### 3.2 Sebelum Menulis Code

- Nyatakan environment: local/development/staging/production.
- Cari pola yang sudah ada sebelum membuat abstraction baru.
- Untuk task lebih dari satu file atau menyentuh business rule, buat plan singkat dan update todo.
- Tentukan acceptance criteria yang dapat diuji.
- Jangan membuka `.env` untuk “sekadar mengecek”; gunakan variable/alias/tooling yang aman.

### 3.3 Saat Implementasi

- Pisahkan UI rendering, domain calculation, API validation, dan data persistence.
- API write harus memiliki: authentication → authorization → schema validation → domain validation → transaction bila multi-record → serialisasi aman → audit event (ketika audit log tersedia).
- Kalkulasi yang memengaruhi nilai uang harus tetap integer rupiah; tidak gunakan float currency.
- Bila menambah endpoint, daftarkan di `ARCHITECTURE.md` dan tentukan aksesnya.
- Bila menambah model/schema, gunakan migration versioned; update mapper/seed/test sekaligus.
- Bila menambah status, update PRD, enum/type, badge UI, filter, perhitungan, dan tests sekaligus.

### 3.4 Setelah Implementasi

1. Jalankan tests yang relevan.
2. Jalankan `npm run build`.
3. Browser-check alur yang berubah, termasuk mobile bila UI berubah.
4. Untuk dokumen, test print A4 setelah perubahan layout.
5. Untuk DB/API, verifikasi row/response tanpa menampilkan secret.
6. Update dokumentasi status dan progress log.
7. Report: perubahan, verifikasi, batasan/risiko yang tersisa.

---

## 4. Quality Gates

### Gate A — Semua Perubahan

- [ ] Type-safe dan build sukses.
- [ ] Tidak ada `.env`, database dump, log browser, `node_modules`, atau `.next` di stage Git.
- [ ] Tidak mengubah file tidak terkait.
- [ ] Dokumen yang relevan diperbarui.

### Gate B — Financial / Document Domain

- [ ] Total/tax/terbilang benar untuk input baru.
- [ ] Input server-side tervalidasi; UI validation bukan satu-satunya proteksi.
- [ ] Nomor/token/hash dibuat di server.
- [ ] Semua document child menyimpan/menampilkan referensi parent.
- [ ] Payment + Receipt atomik; failure tidak meninggalkan orphan record.
- [ ] Payment tidak dapat melebihi outstanding di server.
- [ ] Termin tidak dapat melebihi total penawaran di server.
- [ ] Dokumen final tidak dapat diedit/destruktif tanpa flow void/reissue.

### Gate C — Public Validation / Privacy

- [ ] Token random, tidak predictable.
- [ ] Token valid/tidak valid memberi state tepat.
- [ ] Public page tidak mengekspos data internal atau dokumen klien lain.
- [ ] Rate limiting/abuse plan dipertimbangkan untuk production.

### Gate D — Deployment

- [ ] Auth dan authorization nyata telah aktif.
- [ ] `reset` dan dev seed tidak dapat dieksekusi di production.
- [ ] Migrations versioned, backup, env production, health check siap.
- [ ] Production smoke test dan rollback plan tersedia.

---

## 5. Konvensi Dokumentasi

| Dokumen | Kapan diubah | Isi |
| --- | --- | --- |
| `docs/PRD.md` | Ada keputusan produk/perilaku baru | Apa/kenapa/rule/acceptance/roadmap |
| `docs/CURRENT_STATE.md` | Status fitur, risiko, blocker, environment berubah | Fakta implementasi dan next slice |
| `docs/ARCHITECTURE.md` | Model/API/boundary/data flow berubah | Struktur teknis dan diagram |
| `docs/PROGRESS_LOG.md` | Setiap slice selesai | Ringkas perubahan, verifikasi, known limitation |
| `AGENTS.md` | Petunjuk implementasi berulang berubah | Instruksi ringkas yang harus dibaca agent |
| `README.md` | Onboarding/run/deploy local berubah | Cara mulai bagi developer baru |

**Aturan commit:** perubahan perilaku tanpa dokumentasi terkait dianggap belum selesai.

---

## 6. Git dan PR Convention

### Branch

- `main`: selalu buildable; jangan push perubahan eksperimen setengah jadi.
- `feat/<domain>-<ringkas>`: feature.
- `fix/<domain>-<ringkas>`: bug.
- `docs/<topik>`: dokumentasi.
- `chore/<topik>`: tool/maintenance.

### Commit

Gunakan format ringkas dan bermakna:

```text
feat(invoice): enforce remaining termin percentage
fix(payment): reject overpayment transactionally
docs: establish PRD and sustainable workflow
chore(prisma): add versioned initial migration
```

### Pull Request

Setiap PR menyatakan:

1. masalah dan perubahan perilaku;
2. aturan PRD yang terpengaruh;
3. bukti verifikasi (build/test/browser/DB); 
4. migration/env/deployment impact;
5. risiko dan rollback bila ada.

---

## 7. Handoff Template untuk Agent/Model Berikutnya

Gunakan template ini pada akhir sesi bila pekerjaan belum sepenuhnya selesai:

```markdown
## Handoff — <tanggal>

### Objective
- <hasil yang ingin dicapai>

### Done
- <perubahan file/behavior>

### Verified
- <command/test/browser/DB result tanpa secret>

### Current State
- Branch/commit: <id>
- Environment: <local/dev/staging>
- Data/migration state: <deskripsi aman>

### Open Risks / Blockers
- <daftar>

### Next Exact Step
1. <aksi paling kecil yang benar-benar bisa dijalankan>

### Documents Updated
- <link dokumen>
```

Jangan menyimpan credential, raw log yang sensitif, atau host/IP di handoff.

---

## 8. Definition of Done

Sebuah task disebut selesai hanya bila:

- kebutuhan dan acceptance criterion terpenuhi;
- code/build/test relevan lulus;
- data/domain integrity dipastikan bila task menyentuh document/payment;
- UI diperiksa bila user-facing;
- dokumen status diperbarui;
- tidak ada secret/artifact lokal ikut Git;
- limitation yang belum selesai disebutkan dengan jelas.
