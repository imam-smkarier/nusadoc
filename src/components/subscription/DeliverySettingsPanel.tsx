"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Save,
  Send,
  XCircle,
} from "lucide-react";
import { Button, Card, CardHeader, Toggle } from "@/components/ui/primitives";
import { Field, Select, TextInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/Modal";
import { useCan } from "@/lib/auth";
import { formatDateShort } from "@/lib/utils";

interface DeliverySettingsDto {
  emailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPasswordSet: boolean;
  smtpFromName: string;
  smtpFromEmail: string;
  waEnabled: boolean;
  waProvider: string;
  waTokenSet: boolean;
  waAdminPhone: string;
  autoSendOnPublish: boolean;
  autoSendOnPayment: boolean;
  reminderDaysBeforeDue: number;
}

interface DeliveryLogDto {
  id: string;
  channel: string;
  target: string;
  subject: string;
  status: string;
  error: string | null;
  relatedType: string | null;
  createdAt: string;
}

/**
 * Panel setup Email & WhatsApp delivery (admin) — kredensial tersimpan terenkripsi
 * AES-256-GCM di server; UI hanya menerima status "terisi", tidak pernah plaintext.
 */
export function DeliverySettingsPanel() {
  const canSettings = useCan("settings.update");
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState<DeliverySettingsDto | null>(null);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [waToken, setWaToken] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [logs, setLogs] = useState<DeliveryLogDto[]>([]);

  const set = <K extends keyof DeliverySettingsDto>(k: K, v: DeliverySettingsDto[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsRes, logsRes] = await Promise.all([
        fetch("/api/delivery/settings"),
        fetch("/api/delivery/logs?take=10"),
      ]);
      const settingsJson = await settingsRes.json();
      const logsJson = await logsRes.json();
      if (settingsJson.ok) setForm(settingsJson.settings);
      if (logsJson.ok) setLogs(logsJson.logs);
    } catch {
      toast({ tone: "error", title: "Gagal memuat konfigurasi delivery" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch("/api/delivery/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // Kirim password/token hanya bila diisi — kosong berarti tidak diubah
          smtpPassword: smtpPassword || undefined,
          waToken: waToken || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setForm(json.settings);
      setSmtpPassword("");
      setWaToken("");
      toast({ tone: "success", title: "Konfigurasi delivery tersimpan" });
    } catch (err) {
      toast({
        tone: "error",
        title: "Gagal menyimpan",
        desc: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    if (!testEmail && !testPhone) {
      toast({ tone: "info", title: "Isi email atau nomor WA tujuan tes terlebih dahulu" });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/delivery/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail || undefined, phone: testPhone || undefined }),
      });
      const json = await res.json();
      const parts: string[] = [];
      if (json.results?.email) {
        parts.push(json.results.email.ok ? "Email ✓ terkirim" : `Email ✗ ${json.results.email.error}`);
      }
      if (json.results?.whatsapp) {
        parts.push(
          json.results.whatsapp.ok ? "WhatsApp ✓ terkirim" : `WhatsApp ✗ ${json.results.whatsapp.error}`
        );
      }
      toast({
        tone: json.ok ? "success" : "error",
        title: json.ok ? "Pesan tes berhasil dikirim" : "Sebagian pengiriman gagal",
        desc: parts.join(" · "),
      });
      void loadAll();
    } catch {
      toast({ tone: "error", title: "Gagal menjalankan tes pengiriman" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Pengiriman Email & WhatsApp" desc="Memuat konfigurasi…" />
        <div className="flex h-32 items-center justify-center text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </Card>
    );
  }
  if (!form) return null;

  return (
    <Card>
      <CardHeader
        title="Pengiriman Email & WhatsApp"
        desc="Kredensial tersimpan terenkripsi (AES-256-GCM). Kegagalan pengiriman tidak menggagalkan penerbitan dokumen."
        action={
          canSettings && (
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan
            </Button>
          )
        }
      />

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        {/* ── Email / SMTP ── */}
        <div className="space-y-3.5 rounded-xl border border-line bg-canvas/60 p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-display text-[14px] font-bold text-navy">
              <Mail className="h-4 w-4 text-brand" /> Email (SMTP)
            </p>
            {canSettings && (
              <Toggle
                checked={form.emailEnabled}
                onChange={(v) => set("emailEnabled", v)}
                label=""
              />
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="SMTP Host" className="col-span-2">
              <TextInput
                value={form.smtpHost}
                onChange={(e) => set("smtpHost", e.target.value)}
                placeholder="smtp.gmail.com"
                disabled={!canSettings}
              />
            </Field>
            <Field label="Port">
              <TextInput
                type="number"
                value={form.smtpPort}
                onChange={(e) => set("smtpPort", Number(e.target.value))}
                disabled={!canSettings}
              />
            </Field>
          </div>

          <Toggle
            checked={form.smtpSecure}
            onChange={(v) => set("smtpSecure", v)}
            label="Koneksi TLS implisit (SSL, port 465)"
            hint="Biaya mati untuk STARTTLS port 587."
          />

          <div className="grid grid-cols-2 gap-3">
            <Field label="SMTP Username">
              <TextInput
                value={form.smtpUser}
                onChange={(e) => set("smtpUser", e.target.value)}
                placeholder="notif@smkarier.co.id"
                disabled={!canSettings}
              />
            </Field>
            <Field
              label="SMTP Password"
              hint={form.smtpPasswordSet ? "Tersimpan terenkripsi — isi ulang hanya bila ingin mengganti." : undefined}
            >
              <TextInput
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder={form.smtpPasswordSet ? "•••••••• (tersimpan)" : "App password / password SMTP"}
                disabled={!canSettings}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama Pengirim">
              <TextInput
                value={form.smtpFromName}
                onChange={(e) => set("smtpFromName", e.target.value)}
                disabled={!canSettings}
              />
            </Field>
            <Field label="Email Pengirim">
              <TextInput
                value={form.smtpFromEmail}
                onChange={(e) => set("smtpFromEmail", e.target.value)}
                placeholder="notif@smkarier.co.id"
                disabled={!canSettings}
              />
            </Field>
          </div>
        </div>

        {/* ── WhatsApp ── */}
        <div className="space-y-3.5 rounded-xl border border-line bg-canvas/60 p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-display text-[14px] font-bold text-navy">
              <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp (Gateway)
            </p>
            {canSettings && (
              <Toggle checked={form.waEnabled} onChange={(v) => set("waEnabled", v)} label="" />
            )}
          </div>

          <Field label="Provider" hint="Fonnte / WaBlas — keduanya cukup memakai API token device."
          >
            <Select
              value={form.waProvider}
              onChange={(e) => set("waProvider", e.target.value)}
              disabled={!canSettings}
            >
              <option value="fonnte">Fonnte (rekomendasi)</option>
              <option value="wablas">WaBlas</option>
            </Select>
          </Field>

          <Field
            label="API Token / Device Key"
            hint={form.waTokenSet ? "Token tersimpan terenkripsi — isi ulang hanya bila ingin mengganti." : undefined}
          >
            <TextInput
              type="password"
              value={waToken}
              onChange={(e) => setWaToken(e.target.value)}
              placeholder={form.waTokenSet ? "•••••••• (tersimpan)" : "Token dari dashboard provider"}
              disabled={!canSettings}
            />
          </Field>

          <Field
            label="Nomor WA Admin"
            hint="Menerima notifikasi internal (mis. pembayaran diterima)."
          >
            <TextInput
              value={form.waAdminPhone}
              onChange={(e) => set("waAdminPhone", e.target.value)}
              placeholder="081213582508"
              disabled={!canSettings}
            />
          </Field>
        </div>

        {/* ── Otomatisasi ── */}
        <div className="space-y-3 rounded-xl border border-line bg-canvas/60 p-4">
          <p className="font-display text-[14px] font-bold text-navy">Otomatisasi Pengiriman</p>
          <Toggle
            checked={form.autoSendOnPublish}
            onChange={(v) => set("autoSendOnPublish", v)}
            label="Kirim penawaran & invoice otomatis saat terbit/terkirim"
            hint="Dikirim ke email & WA PIC klien sesuai master data."
          />
          <Toggle
            checked={form.autoSendOnPayment}
            onChange={(v) => set("autoSendOnPayment", v)}
            label="Kirim kwitansi otomatis saat pembayaran dicatat"
            hint="Termasuk notifikasi WA ke admin."
          />
          <Field
            label="Reminder jatuh tempo (hari sebelum)"
            hint="0 = reminder dimatikan. Eksekusi reminder terjadwal menyusul (cron)."
          >
            <TextInput
              type="number"
              value={form.reminderDaysBeforeDue}
              onChange={(e) => set("reminderDaysBeforeDue", Number(e.target.value))}
              disabled={!canSettings}
            />
          </Field>
        </div>

        {/* ── Tes pengiriman ── */}
        <div className="space-y-3 rounded-xl border border-line bg-canvas/60 p-4">
          <p className="font-display text-[14px] font-bold text-navy">Tes Pengiriman</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email tujuan tes">
              <TextInput
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="imam@smkarier.co.id"
                disabled={!canSettings}
              />
            </Field>
            <Field label="Nomor WA tujuan tes">
              <TextInput
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="081213582508"
                disabled={!canSettings}
              />
            </Field>
          </div>
          {canSettings && (
            <Button onClick={runTest} disabled={testing} className="w-full">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Kirim Pesan Tes
            </Button>
          )}
        </div>
      </div>

      {/* ── Log pengiriman ── */}
      <div className="border-t border-line px-5 py-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12.5px] font-semibold text-navy">Log Pengiriman Terakhir</p>
          <Button variant="ghost" onClick={() => void loadAll()}>
            <RefreshCw className="h-3.5 w-3.5" /> Muat ulang
          </Button>
        </div>
        {logs.length === 0 ? (
          <p className="py-3 text-center text-[12px] text-slate-400">Belum ada aktivitas pengiriman.</p>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white text-[12px]">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  {l.status === "sent" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-navy">
                      {l.channel === "email" ? "Email" : "WhatsApp"} → <span className="tnum">{l.target}</span>
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {l.subject || "—"} · {formatDateShort(l.createdAt.slice(0, 10))}
                      {l.error ? ` · ${l.error}` : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[10.5px] font-bold uppercase ${
                    l.status === "sent" ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {l.status === "sent" ? "Terkirim" : "Gagal"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
