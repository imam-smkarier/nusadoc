import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import type { User } from "@prisma/client";

/**
 * Mobile JWT & Refresh Token Service (100% native node:crypto, zero-dependency).
 * Access token: 2 jam (HMAC-SHA256).
 * Refresh token: 30 hari (disimpan terenkripsi/hash di DB).
 */

const ACCESS_TOKEN_TTL_SEC = 2 * 60 * 60; // 2 jam
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari

function getJwtSecret(): Buffer {
  const raw = process.env.MOBILE_JWT_SECRET;
  // Fallback yang bisa ditebak = siapa pun bisa menerbitkan token untuk user tenant mana pun.
  if (!raw && process.env.NODE_ENV === "production") {
    throw new Error("MOBILE_JWT_SECRET wajib diset di production");
  }
  return crypto.createHash("sha256").update(raw || `dev:${process.env.DATABASE_URL ?? ""}`).digest();
}

function base64UrlEncode(data: Buffer | string): string {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(str: string): Buffer {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return Buffer.from(base64, "base64");
}

export interface MobileJwtPayload {
  sub: string; // User ID
  email: string;
  name: string;
  role: string;
  deviceId: string;
  iat: number;
  exp: number;
}

/** Buat token JWT (header.payload.signature) */
export function signMobileJwt(payload: Omit<MobileJwtPayload, "iat" | "exp">): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: MobileJwtPayload = {
    ...payload,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SEC,
  };

  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${header}.${body}`;
  const signature = base64UrlEncode(crypto.createHmac("sha256", getJwtSecret()).update(data).digest());

  return `${data}.${signature}`;
}

/** Verifikasi token JWT */
export function verifyMobileJwt(token: string): MobileJwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;

  const data = `${header}.${body}`;
  const expectedSig = base64UrlEncode(crypto.createHmac("sha256", getJwtSecret()).update(data).digest());

  const given = Buffer.from(signature);
  if (given.length !== expectedSig.length || !crypto.timingSafeEqual(given, Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body).toString("utf8")) as MobileJwtPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

/** Buat pasangan Access Token & Refresh Token */
export async function createMobileTokenPair(user: User, deviceId: string) {
  const accessToken = signMobileJwt({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    deviceId,
  });

  const rawRefreshToken = crypto.randomBytes(40).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  // Simpan refresh token di DB (hapus token lama untuk device yang sama)
  await prisma.mobileRefreshToken.deleteMany({
    where: { userId: user.id, deviceId },
  });

  await prisma.mobileRefreshToken.create({
    data: {
      id: `rtok_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      userId: user.id,
      deviceId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SEC,
    tokenType: "Bearer",
  };
}

/** Tukar refresh token menjadi access token baru */
export async function refreshMobileAccessToken(refreshToken: string) {
  const tokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
  const record = await prisma.mobileRefreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    if (record) await prisma.mobileRefreshToken.delete({ where: { id: record.id } });
    return null;
  }

  const newAccessToken = signMobileJwt({
    sub: record.user.id,
    email: record.user.email,
    name: record.user.name,
    role: record.user.role,
    deviceId: record.deviceId,
  });

  return {
    accessToken: newAccessToken,
    expiresIn: ACCESS_TOKEN_TTL_SEC,
    tokenType: "Bearer",
  };
}

/** Guard middleware untuk endpoint /api/mobile/* */
export async function requireMobileUser(req: NextRequest): Promise<
  | { user: User; deviceId: string; payload: MobileJwtPayload }
  | NextResponse
> {
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid Authorization header. Format: Bearer <token>" },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7).trim();
  const payload = verifyMobileJwt(token);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Token akses tidak valid atau telah kedaluwarsa" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "Pengguna tidak ditemukan" }, { status: 401 });
  }

  return { user, deviceId: payload.deviceId, payload };
}
