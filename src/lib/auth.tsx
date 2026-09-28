"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { can } from "@/lib/permissions";

/**
 * Auth client — sesi nyata disimpan server-side (cookie HttpOnly).
 * Provider hanya menampung identitas untuk UI, bukan token sesi.
 */

export interface AuthUser {
  email: string;
  name: string;
  role: string;
}

interface AuthContextValue {
  authed: boolean;
  checked: boolean;
  name: string;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { user: AuthUser };
          setUser(data.user);
        }
      } catch {
        /* API tidak terjangkau — dianggap belum login */
      }
      setChecked(true);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { user?: AuthUser; error?: string };
      if (!res.ok || !data.user) {
        return { ok: false, error: data.error || "Login gagal" };
      }
      setUser(data.user);
      return { ok: true };
    } catch {
      return { ok: false, error: "Server tidak terjangkau" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ authed: !!user, checked, name: user?.name ?? "Pengguna", user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}

/** Hook RBAC UI: sembunyikan aksi yang tidak diizinkan untuk role aktif. */
export function useCan(action: string): boolean {
  const { user } = useAuth();
  return can(user?.role, action);
}
