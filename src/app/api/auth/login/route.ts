import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "@/lib/server/password";
import { createSession, ensureAdminUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import { seedIfEmpty } from "@/lib/server/seedDb";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";

export async function POST(req: NextRequest) {
  if (!rateLimit(`login:${clientIp(req)}`, 10, 5 * 60_000)) {
    return NextResponse.json({ error: "Terlalu banyak percobaan — coba beberapa menit lagi" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "Email dan kata sandi wajib" }, { status: 400 });
  }

  // Development: pastikan seed + user admin tersedia pada database kosong.
  if (process.env.NODE_ENV !== "production") {
    await seedIfEmpty(prisma);
  }
  await ensureAdminUser();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Email atau kata sandi salah" }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({ user: { email: user.email, name: user.name, role: user.role } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
}
