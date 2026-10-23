import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { requireMobileUser } from "@/lib/server/mobile-auth";
import { hashPassword } from "@/lib/server/password";

export async function POST(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const publicKey = String(body.publicKey ?? "").trim();
    const fcmToken = body.fcmToken ? String(body.fcmToken).trim() : undefined;
    const biometricType = String(body.biometricType ?? "biometric");
    const pin = body.pin ? String(body.pin).trim() : undefined;

    if (!publicKey && !pin) {
      return NextResponse.json(
        { ok: false, error: "publicKey (ECDSA P-256) atau pin wajib diisi" },
        { status: 400 }
      );
    }

    // Kunci publik & PIN hanya boleh dipasang pada perangkat milik user ini sendiri.
    const existing = await prisma.deviceSigner.findUnique({ where: { deviceId: auth.deviceId }, select: { userId: true } });
    if (existing && existing.userId !== auth.user.id) {
      return NextResponse.json(
        { ok: false, error: "Perangkat ini sudah terdaftar untuk akun lain" },
        { status: 409 }
      );
    }

    const pinHash = pin ? hashPassword(pin) : undefined;

    const device = await prisma.deviceSigner.upsert({
      where: { deviceId: auth.deviceId },
      update: {
        ...(publicKey ? { publicKey } : {}),
        ...(fcmToken !== undefined ? { fcmToken } : {}),
        ...(biometricType ? { biometricType } : {}),
        ...(pinHash ? { pinHash } : {}),
        lastUsedAt: new Date(),
        isActive: true,
      },
      create: {
        id: `dev_${Date.now().toString(36)}`,
        userId: auth.user.id,
        deviceId: auth.deviceId,
        deviceName: "Mobile Device",
        publicKey: publicKey || "",
        fcmToken: fcmToken || null,
        biometricType,
        pinHash: pinHash || null,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      device: {
        id: device.id,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        isKeyRegistered: Boolean(device.publicKey),
        biometricType: device.biometricType,
        isPinSet: Boolean(device.pinHash),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mendaftarkan kunci perangkat";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
