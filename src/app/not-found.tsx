import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
      <p className="font-display text-[64px] font-bold leading-none text-navy/10">404</p>
      <h1 className="font-display text-[22px] font-bold text-navy">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-[13.5px] text-slate-500">
        Alamat yang dibuka tidak ada di Nusadoc. Jika kamu memindai QR dokumen, pastikan token pada tautan
        lengkap.
      </p>
      <Link href="/dashboard" className="text-[13.5px] font-semibold text-brand hover:underline">
        ← Ke Dashboard
      </Link>
    </div>
  );
}
