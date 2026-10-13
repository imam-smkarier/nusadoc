"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { can } from "@/lib/permissions";

/**
 * Auth client — sesi nyata disimpan server-side (cookie HttpOnly).
 * Provider menampung identitas user dan organisasi untuk UI.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

export interface AuthOrganization {
  id: string;
  name: string;
  plan: string;
  planName: string;
  status: "active" | "trial" | "expired";
  docsLimit: number | null;
  docsUsed: number;
  docsRemaining: number | null;
  canPublish: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  daysRemaining: number | null;
}

interface AuthContextValue {
  authed: boolean;
  checked: boolean;
  name: string;
  user: AuthUser | null;
  organization: AuthOrganization | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<AuthOrganization | null>(null);
  const [checked, setChecked] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { user: AuthUser; organization?: AuthOrganization };
        setUser(data.user);
        setOrganization(data.organization ?? null);
      } else {
        setUser(null);
        setOrganization(null);
      }
    } catch {
      /* API tidak terjangkau — dianggap belum login */
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  const login = useCallback(
    async (email: string, password: string) => {
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
        await fetchMe();
        return { ok: true };
      } catch {
        return { ok: false, error: "Server tidak terjangkau" };
      }
    },
    [fetchMe]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setOrganization(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authed: !!user,
        checked,
        name: user?.name ?? "Pengguna",
        user,
        organization,
        login,
        logout,
        refreshAuth: fetchMe,
      }}
    >
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
