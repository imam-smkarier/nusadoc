"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from "framer-motion";

const SPLASH_SEEN_KEY = "nusadoc-splash-seen";
const TOTAL_MS = 2100;

const TAGLINE_WORDS = ["Aman.", "Cepat.", "Terverifikasi."];

/**
 * Entrance/Opening Nusadoc — full-screen splash beranimasi (pola premium 21st.dev):
 * logo scale+glow → wordmark blur-in → tagline stagger per kata → progress → fade exit.
 * Tampil sekali per sesi browser (sessionStorage); hormati prefers-reduced-motion.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"checking" | "playing" | "done">("checking");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = sessionStorage.getItem(SPLASH_SEEN_KEY);
    if (seen || reduced) {
      setPhase("done");
      return;
    }
    setPhase("playing");
    // Tandai "sudah dilihat" hanya SETELAH selesai — React StrictMode (dev)
    // mount dua kali; menulis saat mulai membuat mount kedua langsung skip.
    const t = setTimeout(() => {
      sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
      setPhase("done");
    }, TOTAL_MS);
    return () => clearTimeout(t);
  }, []);

  // Progress bar 0 → 100
  const progress = useMotionValue(0);
  useEffect(() => {
    if (phase !== "playing") return;
    const controls = animate(progress, 100, { duration: TOTAL_MS / 1000, ease: "easeInOut" });
    return () => controls.stop();
  }, [phase, progress]);
  const progressWidth = useTransform(progress, (v) => `${v}%`);

  return (
    <AnimatePresence>
      {phase === "playing" && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-navy-900"
          aria-label="Nusadoc sedang membuka"
          role="status"
        >
          {/* Ambient glow */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/25 blur-[120px]"
            animate={{ opacity: [0.25, 0.6, 0.35], scale: [0.9, 1.1, 1] }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-[90px]"
            animate={{ opacity: [0.2, 0.45, 0.2] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Grid halus */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            }}
          />

          <div className="relative flex flex-col items-center">
            {/* Logo — scale + blur-in + glow ring */}
            <motion.div
              initial={{ scale: 0.55, opacity: 0, filter: "blur(14px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <motion.div
                aria-hidden
                className="absolute -inset-5 rounded-3xl border border-brand/30"
                animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.15, 0.5] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <Image
                src="/images/brand/nusadoc-symbol-on-dark.png"
                alt="Nusadoc"
                width={855}
                height={937}
                priority
                className="h-20 w-auto drop-shadow-[0_0_28px_rgba(8,126,212,0.45)]"
              />
            </motion.div>

            {/* Wordmark */}
            <motion.p
              initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 font-display text-[30px] font-bold tracking-tight text-white"
            >
              Nusa<span className="text-brand">doc</span>
            </motion.p>

            {/* Tagline — stagger per kata */}
            <div className="mt-2.5 flex items-center gap-2" aria-label="Aman. Cepat. Terverifikasi.">
              {TAGLINE_WORDS.map((word, i) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.18, duration: 0.45, ease: "easeOut" }}
                  className="text-[12.5px] font-medium tracking-[0.14em] text-slate-300"
                >
                  {word}
                </motion.span>
              ))}
            </div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-9 h-[3px] w-44 overflow-hidden rounded-full bg-white/10"
            >
              <motion.div className="h-full rounded-full bg-brand" style={{ width: progressWidth }} />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
