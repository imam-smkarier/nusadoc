"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks?: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

export function useMidtransSnap() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Cek apakah snap sudah terpasang
    if (window.snap) {
      setLoaded(true);
      return;
    }

    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
    const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
    const snapUrl = isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

    const script = document.createElement("script");
    script.src = snapUrl;
    script.setAttribute("data-client-key", clientKey);
    script.async = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => {
      // Jangan gagalkan aplikasi bila script eksternal diblokir jaringan lokal
      console.warn("Gagal memuat Midtrans Snap script");
    };

    document.head.appendChild(script);

    return () => {
      // Tidak perlu hapus script agar reuse across navigasi
    };
  }, []);

  const openSnap = (
    token: string,
    redirectUrl?: string,
    callbacks?: {
      onSuccess?: (result: unknown) => void;
      onPending?: (result: unknown) => void;
      onError?: (result: unknown) => void;
      onClose?: () => void;
    }
  ) => {
    // Bila token simulasi development
    if (token.startsWith("mock-snap-") && redirectUrl) {
      window.location.href = redirectUrl;
      return;
    }

    if (window.snap) {
      window.snap.pay(token, callbacks);
    } else if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      alert("Sistem pembayaran sedang disiapkan. Silakan coba kembali dalam beberapa saat.");
    }
  };

  return { loaded, openSnap };
}
