"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth";

export default function RegisterPage() {
  return (
    <AuthProvider>
      <RegisterInner />
    </AuthProvider>
  );
}

function RegisterInner() {
  const { authed, checked, refreshAuth } = useAuth();
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checked && authed) router.replace("/dashboard");
  }, [checked, authed, router]);

  // 3D tilt ringan mengikuti mouse
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-220, 220], [4, -4]);
  const rotateY = useTransform(mouseX, [-220, 220], [-4, 4]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          name,
          email,
          password,
          phone: phone || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Pendaftaran gagal. Silakan coba kembali.");
        setBusy(false);
        return;
      }

      await refreshAuth();
      router.replace("/dashboard");
    } catch {
      setError("Server tidak terjangkau. Periksa koneksi internet Anda.");
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* ═══ Panel brand kiri — navy, identitas & keunggulan trial ═══ */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-12 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700" />
        <div className="absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-brand/20 blur-[110px]" />
        <motion.div
          className="absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-brand/10 blur-[100px]"
          animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.12, 1] }}
          transition={{ duration: 7, repeat: Infinity, repeatType: "mirror" }}
        />

        {/* Logo */}
        <Link href="/" className="relative flex items-center gap-3">
          <Image
            src="/images/brand/nusadoc-symbol-on-dark.png"
            alt="Nusadoc"
            width={855}
            height={937}
            className="h-12 w-auto shrink-0"
          />
          <div className="leading-none">
            <p className="font-display text-[24px] font-bold tracking-tight text-white">
              Nusa<span className="text-brand">doc</span>
            </p>
            <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.28em] text-slate-400">
              Sistem Dokumen Bisnis
            </p>
          </div>
        </Link>

        {/* Headline & Value proposition */}
        <div className="relative max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Trial Gratis 30 Hari Penuh
          </div>
          <h1 className="font-display text-[34px] font-bold leading-[1.14] text-white">
            Mulai tertibkan tagihan termin &amp; kwitansi bisnis Anda.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-300">
            Daftarkan bisnis Anda dalam 60 detik. Langsung dapatkan workspace privat lengkap dengan
            seluruh fitur canggih: multi-termin proyek, QR verifikasi publik, kalkulasi pajak otomatis,
            dan pengiriman WhatsApp/Email.
          </p>

          <ul className="mt-6 space-y-3 text-[13.5px] text-slate-200">
            {[
              "30 hari akses penuh ke semua fitur tanpa batasan dokumen",
              "Tanpa perlu kartu kredit — cukup nama bisnis dan email",
              "Data terlindungi enkripsi dan tersimpan di database privat",
              "Bisa upgrade kapan saja ke paket Lite (Rp 50 rb) atau Bulanan",
            ].map((b) => (
              <li key={b} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer info */}
        <p className="relative text-[11.5px] text-slate-500">
          Nusadoc · PT. SMKarier Inovasi Digital · Dokumen Sah Kriptografis
        </p>
      </div>

      {/* ═══ Panel kanan — formulir registrasi ═══ */}
      <div className="relative flex items-center justify-center bg-canvas p-6 sm:p-10">
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="w-full max-w-[460px] perspective-[1000px]"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            mouseX.set(e.clientX - (rect.left + rect.width / 2));
            mouseY.set(e.clientY - (rect.top + rect.height / 2));
          }}
          onMouseLeave={() => {
            mouseX.set(0);
            mouseY.set(0);
          }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-line bg-panel p-7 shadow-card sm:p-9">
            {/* Header */}
            <div className="mb-6 space-y-1 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-brand-soft shadow-sm">
                <Image
                  src="/images/brand/nusadoc-symbol.png"
                  alt="Nusadoc"
                  width={855}
                  height={937}
                  className="h-auto w-8"
                />
              </div>
              <h2 className="font-display text-[22px] font-bold text-navy">
                Buat Akun Nusadoc
              </h2>
              <p className="text-[13px] text-slate-500">
                Mulai uji coba gratis 30 hari untuk perusahaan Anda
              </p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-3.5">
              {/* Nama Perusahaan */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-navy">Nama Perusahaan / Bisnis</label>
                <div
                  className={`flex items-center gap-2.5 rounded-xl border bg-canvas/40 px-3.5 py-2.5 transition-all duration-200 ${
                    focused === "company"
                      ? "border-brand bg-white ring-2 ring-brand/15"
                      : "border-line hover:border-slate-300"
                  }`}
                >
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT. Maju Bersama Digital"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    onFocus={() => setFocused("company")}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-transparent text-[13.5px] text-navy placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Nama Anda */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-navy">Nama Lengkap PIC</label>
                <div
                  className={`flex items-center gap-2.5 rounded-xl border bg-canvas/40 px-3.5 py-2.5 transition-all duration-200 ${
                    focused === "name"
                      ? "border-brand bg-white ring-2 ring-brand/15"
                      : "border-line hover:border-slate-300"
                  }`}
                >
                  <UserIcon className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocused("name")}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-transparent text-[13.5px] text-navy placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Email Bisnis */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-navy">Email Bisnis</label>
                <div
                  className={`flex items-center gap-2.5 rounded-xl border bg-canvas/40 px-3.5 py-2.5 transition-all duration-200 ${
                    focused === "email"
                      ? "border-brand bg-white ring-2 ring-brand/15"
                      : "border-line hover:border-slate-300"
                  }`}
                >
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="budi@perusahaan.co.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-transparent text-[13.5px] text-navy placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-navy">Kata Sandi (min. 8 karakter)</label>
                <div
                  className={`flex items-center gap-2.5 rounded-xl border bg-canvas/40 px-3.5 py-2.5 transition-all duration-200 ${
                    focused === "password"
                      ? "border-brand bg-white ring-2 ring-brand/15"
                      : "border-line hover:border-slate-300"
                  }`}
                >
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-transparent text-[13.5px] text-navy placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Nomor WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-navy">
                  Nomor WhatsApp <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <div
                  className={`flex items-center gap-2.5 rounded-xl border bg-canvas/40 px-3.5 py-2.5 transition-all duration-200 ${
                    focused === "phone"
                      ? "border-brand bg-white ring-2 ring-brand/15"
                      : "border-line hover:border-slate-300"
                  }`}
                >
                  <Phone className="h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onFocus={() => setFocused("phone")}
                    onBlur={() => setFocused(null)}
                    className="w-full bg-transparent text-[13.5px] text-navy placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-600"
                  role="alert"
                >
                  {error}
                </motion.p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={busy}
                className="btn-sheen mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-[14px] font-bold text-white shadow-md shadow-brand/20 transition-all hover:bg-brand-dark disabled:opacity-50"
              >
                {busy ? "Mendaftarkan Akun..." : "Daftar & Mulai Trial 30 Hari"}
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="pt-2 text-center text-[12.5px] text-slate-500">
                Sudah punya akun?{" "}
                <Link href="/login" className="font-semibold text-brand hover:underline">
                  Masuk di sini
                </Link>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
