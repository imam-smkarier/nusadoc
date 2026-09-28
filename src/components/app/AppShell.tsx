"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  ScrollText,
  Settings,
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
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

/** Gate mockup: tanpa sesi → redirect /login. /v/[token] bebas di luar shell ini. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { authed, checked, name, logout } = useAuth();
  const { ready, localMode } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!checked || !ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (!authed) {
    router.replace("/login");
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
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Image src="/images/brand/nusadoc-symbol.png" alt="NTS" width={375} height={352} className="h-auto w-9" />
        <div className="leading-tight">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Nusadoc</p>
          <p className="font-display text-[17px] font-bold text-white">
            Doc<span className="text-brand">Flow</span>
          </p>
        </div>
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
              <p className="text-[10.5px] text-slate-400">Admin Keuangan · NTS</p>
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
        <div className="flex items-center gap-3 border-b border-line bg-panel px-4 py-3 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg border border-line p-2 text-navy">
            <Menu className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          </button>
          <p className="font-display text-[15px] font-bold text-navy">
            Doc<span className="text-brand">Flow</span>
          </p>
        </div>
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
