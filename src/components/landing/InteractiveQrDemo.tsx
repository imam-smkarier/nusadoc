"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, QrCode, RefreshCw, ShieldCheck, Sparkles, Smartphone, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export function InteractiveQrDemo() {
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);

  // Trigger scan sequence automatically or on reset
  useEffect(() => {
    if (!scanning) return;
    const timer = setTimeout(() => {
      setScanned(true);
      setScanning(false);
    }, 2400);
    return () => clearTimeout(timer);
  }, [scanning]);

  const handleRescan = () => {
    setScanned(false);
    setScanning(true);
  };

  return (
    <div className="relative mx-auto w-full max-w-[420px] select-none">
      {/* Glow background behind device */}
      <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-brand/10 blur-2xl" />

      {/* Smartphone Chassis */}
      <div className="relative overflow-hidden rounded-[36px] border-4 border-slate-800 bg-slate-950 p-3 shadow-2xl shadow-navy/30 ring-1 ring-white/20">
        {/* Dynamic Island / Notch */}
        <div className="relative mx-auto mb-2 flex h-5 w-28 items-center justify-center rounded-full bg-slate-900">
          <div className="h-2 w-2 rounded-full bg-slate-800 mr-2" />
          <div className="h-1.5 w-1.5 rounded-full bg-blue-900/60" />
        </div>

        {/* Screen Viewport */}
        <div className="relative aspect-[9/15] overflow-hidden rounded-[26px] bg-slate-900 text-white">
          {/* Simulated Camera Viewfinder */}
          <div className="relative flex h-full flex-col justify-between p-5">
            {/* Viewfinder Top Bar */}
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Smartphone className="h-3 w-3" /> Kamera Smartphone
              </span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono">1.0x</span>
            </div>

            {/* Target Reticle & QR Code */}
            <div className="relative my-auto flex flex-col items-center">
              <div className="relative flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-white/40 bg-white p-3 shadow-inner">
                {/* Target Corners */}
                <div className="absolute -left-1 -top-1 h-5 w-5 border-l-2 border-t-2 border-brand" />
                <div className="absolute -right-1 -top-1 h-5 w-5 border-r-2 border-t-2 border-brand" />
                <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-2 border-l-2 border-brand" />
                <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-2 border-r-2 border-brand" />

                {/* The QR Code itself */}
                <QRCodeSVG
                  value="https://nusadoc.id/v/demo-live-qr"
                  size={152}
                  level="H"
                  includeMargin={false}
                />

                {/* Animated Laser Scanline */}
                {scanning && (
                  <motion.div
                    initial={{ top: "4%" }}
                    animate={{ top: ["4%", "92%", "4%"] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent shadow-[0_0_12px_#087ed4]"
                  />
                )}
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-300">
                {scanning ? "Mengarahkan kamera ke QR dokumen..." : "QR terdeteksi!"}
              </p>
            </div>

            {/* Verification Result Sheet (Slides up once scanned) */}
            <AnimatePresence>
              {scanned && (
                <motion.div
                  initial={{ opacity: 0, y: 70 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 70 }}
                  transition={{ type: "spring", stiffness: 340, damping: 25 }}
                  className="rounded-2xl border border-line/20 bg-slate-900/95 p-4 text-left shadow-2xl backdrop-blur-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[12px] font-bold text-white leading-tight">
                          Dokumen Resmi Sah
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Hash SHA-256 Diverifikasi Server
                        </p>
                      </div>
                    </div>
                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-400 border border-emerald-500/30">
                      100% ASLI
                    </span>
                  </div>

                  <div className="mt-2.5 rounded-lg bg-black/40 p-2 text-[10.5px] text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nomor:</span>
                      <span className="font-mono font-bold text-white">NSD/INV/2026/09/001-T1</span>
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-slate-400">Penerbit:</span>
                      <span className="font-medium text-white">PT. Nusadoc Solusi Digital</span>
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-slate-400">Nilai:</span>
                      <span className="font-mono font-bold text-brand">Rp 72.705.000</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRescan}
                      className="flex items-center justify-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/20"
                    >
                      <RefreshCw className="h-3 w-3" /> Pindai Ulang
                    </button>
                    <a
                      href="/v/demo-doc"
                      target="_blank"
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand py-1.5 text-[11px] font-semibold text-white shadow transition hover:bg-brand-dark"
                    >
                      <span>Lihat Asli</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
