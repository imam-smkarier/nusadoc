"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight, FileCheck2, Lock, Mail, QrCode, ShieldCheck } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth";

/**
 * Login premium BALANCED — panel brand navy (identitas) + area form terang lembut
 * (nyaman di mata). Teknik light-beam border & 3D tilt diadaptasi dari
 * "Sign In Card" (21st.dev, jatin-yadav05) ke brand Nusadoc.
 */
export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginInner />
    </AuthProvider>
  );
}

function LoginInner() {
  const { login, authed, checked } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("admin@smkarier.co.id");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checked && authed) router.replace("/dashboard");
  }, [checked, authed, router]);

  // 3D tilt ringan mengikuti mouse
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-220, 220], [5, -5]);
  const rotateY = useTransform(mouseX, [-220, 220], [-5, 5]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await login(email, password);
    if (!result.ok) {
      setError(result.error || "Login gagal");
      setBusy(false);
      return;
    }
    router.replace("/dashboard");
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* ═══ Panel brand kiri — navy, identitas & kedalaman ═══ */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-900 p-12 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700" />
        <div className="absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-brand/20 blur-[110px]" />
        <motion.div
          className="absolute -bottom-40 -left-24 h-[420px] w-[420px] rounded-full bg-brand/10 blur-[100px]"
          animate={{ opacity: [0.25, 0.45, 0.25], scale: [1, 1.12, 1] }}
          transition={{ duration: 7, repeat: Infinity, repeatType: "mirror" }}
        />
        <motion.div
          className="absolute right-1/4 top-1/3 h-72 w-72 rounded-full bg-accent/10 blur-[90px]"
          animate={{ opacity: [0.15, 0.3, 0.15], scale: [1.05, 0.95, 1.05] }}
          transition={{ duration: 9, repeat: Infinity, repeatType: "mirror", delay: 1.2 }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        {/* logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-center gap-3"
        >
          <Image src="/images/brand/nusadoc-logo-horizontal.svg" alt="NTS" width={375} height={352} className="h-auto w-12" />
          <div className="leading-tight">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-400">Nusadoc</p>
            <p className="font-display text-[24px] font-bold text-white">
              Doc<span className="text-brand">Flow</span>
            </p>
          </div>
        </motion.div>

        {/* headline */}
        <div className="relative max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            Penawaran · Invoice · Kwitansi
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.7 }}
            className="font-display text-[38px] font-bold leading-[1.12] text-white"
          >
            Satu alur dokumen,
            <br />
            <span className="bg-gradient-to-r from-sky-400 via-brand to-sky-300 bg-clip-text text-transparent">
              divalidasi QR
            </span>{" "}
            sampai ke klien.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42 }}
            className="mt-4 max-w-md text-[14px] leading-relaxed text-slate-300"
          >
            Master klien → penawaran → invoice per termin → kwitansi otomatis. Setiap dokumen terbit membawa
            QR + hash SHA-256 yang bisa diperiksa siapa pun, tanpa login.
          </motion.p>

          <div className="mt-9 space-y-4">
            {[
              { icon: FileCheck2, text: "Builder dokumen dengan preview A4 real-time" },
              { icon: QrCode, text: "QR + hash verifikasi pada setiap dokumen terbit" },
              { icon: ShieldCheck, text: "Hemat tinta — siap cetak di printer kantor" },
            ].map(({ icon: Icon, text }, i) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.14 }}
                className="flex items-center gap-3 text-[13.5px] text-slate-200"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-brand">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="relative text-[11.5px] text-slate-500"
        >
          PT. Nusadoc Technology System · MySQL + Prisma terhubung — data demo tersimpan di database
        </motion.p>
      </div>

      {/* ═══ Form kanan — terang lembut, kartu putih + light beams ═══ */}
      <div className="relative flex items-center justify-center overflow-hidden bg-canvas px-5 py-12">
        <motion.div
          className="absolute -top-24 left-1/2 h-[42vh] w-[105vh] -translate-x-1/2 rounded-b-[50%] bg-brand/[0.09] blur-[80px]"
          animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.98, 1.03, 0.98] }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "mirror" }}
        />
        <div className="absolute bottom-1/4 left-1/4 h-72 w-72 animate-pulse rounded-full bg-brand/[0.06] blur-[100px]" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 w-full max-w-[400px]"
          style={{ perspective: 1400 }}
        >
          <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              mouseX.set(e.clientX - rect.left - rect.width / 2);
              mouseY.set(e.clientY - rect.top - rect.height / 2);
            }}
            onMouseLeave={() => {
              mouseX.set(0);
              mouseY.set(0);
            }}
            className="group relative"
          >
            {/* light beams berjalan di border kartu */}
            <div className="absolute -inset-[2px] overflow-hidden rounded-2xl">
              <motion.div
                className="absolute left-0 top-0 h-[3px] w-1/2 bg-gradient-to-r from-transparent via-brand to-transparent"
                animate={{ left: ["-50%", "100%"], opacity: [0.35, 0.95, 0.35] }}
                transition={{
                  left: { duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 1 },
                  opacity: { duration: 1.4, repeat: Infinity, repeatType: "mirror" },
                }}
              />
              <motion.div
                className="absolute right-0 top-0 h-1/2 w-[3px] bg-gradient-to-b from-transparent via-brand to-transparent"
                animate={{ top: ["-50%", "100%"], opacity: [0.35, 0.95, 0.35] }}
                transition={{
                  top: { duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 1, delay: 0.7 },
                  opacity: { duration: 1.4, repeat: Infinity, repeatType: "mirror", delay: 0.7 },
                }}
              />
              <motion.div
                className="absolute bottom-0 right-0 h-[3px] w-1/2 bg-gradient-to-r from-transparent via-accent to-transparent"
                animate={{ right: ["-50%", "100%"], opacity: [0.35, 0.95, 0.35] }}
                transition={{
                  right: { duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 1, delay: 1.4 },
                  opacity: { duration: 1.4, repeat: Infinity, repeatType: "mirror", delay: 1.4 },
                }}
              />
              <motion.div
                className="absolute bottom-0 left-0 h-1/2 w-[3px] bg-gradient-to-b from-transparent via-accent to-transparent"
                animate={{ bottom: ["-50%", "100%"], opacity: [0.35, 0.95, 0.35] }}
                transition={{
                  bottom: { duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 1, delay: 2.1 },
                  opacity: { duration: 1.4, repeat: Infinity, repeatType: "mirror", delay: 2.1 },
                }}
              />
              {/* titik sudut */}
              <motion.div
                className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-brand/70 blur-[1px]"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatType: "mirror" }}
              />
              <motion.div
                className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-accent/70 blur-[1px]"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatType: "mirror", delay: 1 }}
              />
            </div>

            {/* kartu putih */}
            <div className="relative overflow-hidden rounded-2xl border border-line bg-white p-7 shadow-sheet">
              <div
                className="absolute inset-0 opacity-[0.4]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(11,35,65,0.035) 0.5px, transparent 0.5px), linear-gradient(90deg, rgba(11,35,65,0.035) 0.5px, transparent 0.5px)",
                  backgroundSize: "26px 26px",
                }}
              />

              {/* header */}
              <div className="relative mb-6 space-y-1 text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", duration: 0.8 }}
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-line bg-brand-soft shadow-card"
                >
                  <Image src="/images/brand/nusadoc-logo-horizontal.svg" alt="NTS" width={375} height={352} className="h-auto w-8" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="font-display text-[20px] font-bold text-navy"
                >
                  Masuk ke Nusadoc
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-[12px] text-slate-500"
                >
                  Modul Penawaran & Invoice · PT. SMKarier Inovasi Digital
                </motion.p>
              </div>

              {/* form */}
              <form onSubmit={submit} className="relative space-y-4">
                <motion.div whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                  <div className="relative flex items-center overflow-hidden rounded-lg border border-line bg-white transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
                    <Mail className={`absolute left-3 h-4 w-4 transition-colors ${focused === "email" ? "text-brand" : "text-slate-400"}`} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      placeholder="Email"
                      className="h-11 w-full bg-transparent pl-10 pr-3 text-sm text-navy placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                  <div className="relative flex items-center overflow-hidden rounded-lg border border-line bg-white transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
                    <Lock className={`absolute left-3 h-4 w-4 transition-colors ${focused === "password" ? "text-brand" : "text-slate-400"}`} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      placeholder="Kata sandi"
                      className="h-11 w-full bg-transparent pl-10 pr-16 text-sm text-navy placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 transition-colors hover:text-brand"
                    >
                      {showPassword ? "Sembunyi" : "Lihat"}
                    </button>
                  </div>
                </motion.div>

                {/* tombol masuk */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={busy}
                  className="group/button relative mt-2 block w-full"
                >                  <div className="absolute inset-0 rounded-lg bg-brand/30 opacity-0 blur-lg transition-opacity duration-300 group-hover/button:opacity-90" />
                  <div className="relative flex h-11 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-brand to-brand-dark font-medium text-white shadow-card">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      animate={{ x: busy ? ["-100%", "100%"] : "-100%" }}
                      transition={{ duration: 1.2, ease: "easeInOut", repeat: busy ? Infinity : 0, repeatDelay: 0.4 }}
                    />
                    <AnimatePresence mode="wait">
                      {busy ? (
                        <motion.span
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                          Menyiapkan ruang kerja…
                        </motion.span>
                      ) : (
                        <motion.span
                          key="text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-1.5 text-sm font-semibold"
                        >
                          Masuk
                          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/button:translate-x-1" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>

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

                <p className="rounded-lg border border-dashed border-line bg-canvas/70 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-slate-500">
                  Demo awal: <span className="tnum font-semibold text-navy">admin@smkarier.co.id</span> ·{" "}
                  <span className="tnum font-semibold text-navy">docflow-admin</span> — ganti sebelum dipakai tim.
                </p>
              </form>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
