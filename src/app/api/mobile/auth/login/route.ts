import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { verifyPassword } from "@/lib/server/password";
import { createMobileTokenPair } from "@/lib/server/mobile-auth";
import { uid } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const deviceId = String(body.deviceId ?? "").trim();
    const deviceName = String(body.deviceName ?? "Smartphone").trim();

    if (!email || !password || !deviceId) {
      return NextResponse.json(
        { ok: false, error: "email, password, dan deviceId wajib diisi" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { ok: false, error: "Email atau password tidak sesuai" },
        { status: 401 }
      );
    }

    // deviceId dikirim klien & unik global — perangkat yang terdaftar untuk akun lain tidak boleh diambil alih.
    const existing = await prisma.deviceSigner.findUnique({ where: { deviceId }, select: { userId: true } });
    if (existing && existing.userId !== user.id) {
      return NextResponse.json(
        { ok: false, error: "Perangkat ini sudah terdaftar untuk akun lain" },
        { status: 409 }
      );
    }

    // Daftarkan / perbarui DeviceSigner
    const device = await prisma.deviceSigner.upsert({
      where: { deviceId },
      update: {
        deviceName,
        lastUsedAt: new Date(),
        isActive: true,
      },
      create: {
        id: uid("dev"),
        userId: user.id,
        deviceId,
        deviceName,
        publicKey: "", // Didaftarkan pada langkah berikutnya setelah biometrik aktif
        biometricType: "biometric",
        isActive: true,
        lastUsedAt: new Date(),
      },
    });

    const tokens = await createMobileTokenPair(user, deviceId);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      device: {
        id: device.id,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        isKeyRegistered: Boolean(device.publicKey),
        biometricType: device.biometricType,
      },
      tokens,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses login mobile";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
