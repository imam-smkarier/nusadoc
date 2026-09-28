import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { can } from "@/lib/permissions";
import type { User } from "@prisma/client";
import { prisma } from "./db";

export const SESSION_COOKIE = "docflow_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id: token, userId, expiresAt } });
  return { token, expiresAt };
}

export async function getSessionUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { id: token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function destroyCurrentSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: token } });
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
    secure: process.env.NODE_ENV === "production",
  };
}

/* ── Guard helpers untuk route handlers ── */

export async function requireUser(): Promise<User | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return user;
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(message = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/** Guard RBAC: tolak 403 bila role tidak punya izin aksi. */
export async function requirePermission(action: string): Promise<User | NextResponse> {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (!can(user.role, action)) return forbidden(`Peran ${user.role} tidak berizin untuk ${action}`);
  return user;
}

/** Buat user awal bila belum ada — kredensial dev terdokumentasi di README. */
export async function ensureAdminUser(): Promise<void> {
  const count = await prisma.user.count();
  if (count > 0) return;
  const { hashPassword } = await import("./password");
  const password = process.env.ADMIN_INITIAL_PASSWORD || "docflow-admin";
  const hash = hashPassword(password);
  const users = [
    { id: "user_admin", email: "admin@nafiga.co.id", name: "Admin Keuangan", role: "admin" },
    // akun demo RBAC — hanya dibuat di environment development
    ...(process.env.NODE_ENV !== "production"
      ? [
          { id: "user_sales", email: "sales@nafiga.co.id", name: "Sales NTS", role: "sales" },
          { id: "user_viewer", email: "viewer@nafiga.co.id", name: "Pemantau", role: "viewer" },
        ]
      : []),
  ];
  for (const u of users) {
    await prisma.user.create({ data: { ...u, passwordHash: hash } });
  }
}
