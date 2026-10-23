"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/primitives";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/klien", label: "Klien", icon: Users },
  { href: "/penawaran", label: "Penawaran", icon: FileText },
  { href: "/invoice", label: "Invoice", icon: Receipt },
  { href: "/kwitansi", label: "Kwitansi", icon: ScrollText },
  { href: "/langganan", label: "Langganan", icon: CreditCard },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

/** Gate mockup: tanpa sesi → redirect /login. /v/[token] bebas di luar shell ini. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { authed, checked, name, organization, logout } = useAuth();
  const { ready, localMode } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Navigasi adalah efek samping — tidak boleh dipicu saat render (React melarang update Router di fase render).
  useEffect(() => {
    if (checked && ready && !authed) router.replace("/login");
  }, [checked, ready, authed, router]);

  if (!checked || !ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
              active ? "bg-brand-soft text-brand" : "text-slate-300 hover:bg-navy-600 hover:text-white"
            )}
          >
            <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <Image
            src="/images/brand/nusadoc-symbol-on-dark.png"
            alt="Nusadoc"
            width={855}
            height={937}
            className="h-8 w-auto shrink-0"
          />
          <span className="truncate font-display text-[19px] font-bold leading-none tracking-tight text-white">
            Nusa<span className="text-brand">doc</span>
          </span>
        </div>
        {organization && (
          <Link
            href="/langganan"
            className="mt-3 flex items-center justify-between gap-1.5 rounded-lg border border-navy-700 bg-navy-800/80 px-2.5 py-1.5 text-[11px] transition hover:border-brand/40"
          >
            <span className="truncate font-medium text-slate-300" title={organization.name}>
              {organization.name}
            </span>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider ${
                organization.status === "active"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : organization.status === "trial"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}
            >
              {organization.planName}
            </span>
          </Link>
        )}
      </div>
      {nav}
      <div className="border-t border-navy-600 px-3 py-3">
        <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[12px] font-bold text-brand">
              {name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-white">{name}</p>
              <p className="text-[10.5px] text-slate-400">Keuangan · Nusadoc</p>
            </div>
          </div>
          <button
            title="Keluar"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="rounded-lg p-2 text-slate-400 hover:bg-navy-600 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh w-[230px] shrink-0 flex-col bg-navy lg:flex">{sidebarInner}</aside>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-[250px] flex-col bg-navy shadow-pop">
            <button className="absolute right-2 top-3 rounded p-2 text-slate-400 hover:text-white" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </button>
            {sidebarInner}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <div className="flex items-center justify-between border-b border-line bg-panel px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg border border-line p-2 text-navy">
              <Menu className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            </button>
            <p className="font-display text-[15px] font-bold text-navy">
              Nusa<span className="text-brand">doc</span>
            </p>
          </div>
          {organization && (
            <Link
              href="/langganan"
              className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-brand"
            >
              {organization.planName}
            </Link>
          )}
        </div>
        {organization?.status === "expired" && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200 bg-rose-50 px-5 py-2.5 text-[12.5px] font-medium text-rose-800">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              Masa trial / paket langganan Anda telah berakhir. Akun berstatus <strong>Read-Only</strong>.
            </span>
            <Link
              href="/langganan"
              className="shrink-0 rounded-lg bg-rose-600 px-3 py-1 text-[11.5px] font-bold text-white shadow-sm hover:bg-rose-700"
            >
              Upgrade Paket Sekarang →
            </Link>
          </div>
        )}
        {organization?.status === "trial" && organization.daysRemaining !== null && organization.daysRemaining <= 7 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-5 py-2 text-[12px] font-medium text-amber-900">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
              Masa trial 30 hari tersisa <strong>{organization.daysRemaining} hari lagi</strong>.
            </span>
            <Link
              href="/langganan"
              className="shrink-0 font-bold text-brand hover:underline"
            >
              Pilih Paket Berlangganan →
            </Link>
          </div>
        )}
        {localMode && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-[12.5px] font-medium text-amber-800">
            Mode lokal aktif — server/database tidak terjangkau. Penerbitan dokumen &amp; pencatatan pembayaran
            dinonaktifkan sampai koneksi pulih.
          </div>
        )}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  desc,
  actions,
}: {
  title: string;
  desc?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line bg-panel px-5 py-5 lg:px-7">
      <div>
        <h1 className="font-display text-[22px] font-bold tracking-tight text-navy">{title}</h1>
        {desc && <p className="mt-1 text-[13px] text-slate-500">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
