import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { requireMobileUser } from "@/lib/server/mobile-auth";
import { can } from "@/lib/permissions";
import {
  createSignatureChallenge,
  verifyBiometricSignature,
  verifySignerPin,
} from "@/lib/server/biometric-verify";
import { logAudit } from "@/lib/server/audit";
import { uid } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  // Hanya role yang berizin quotation.decide (admin/finance) yang boleh menyetujui
  if (!can(auth.user.role, "quotation.decide")) {
    return NextResponse.json(
      { ok: false, error: `Peran ${auth.user.role} tidak berizin untuk menyetujui dokumen` },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const signatureBase64 = body.signatureBase64 ? String(body.signatureBase64) : "";
    const pin = body.pin ? String(body.pin) : "";
    const timestamp = Number(body.timestamp) || Date.now();
    const biometricType = String(body.biometricType ?? "biometric");
    const deviceInfo = String(body.deviceInfo ?? "Mobile Device");
    const latitude = body.latitude ? Number(body.latitude) : null;
    const longitude = body.longitude ? Number(body.longitude) : null;

    const device = await prisma.deviceSigner.findUnique({
      where: { deviceId: auth.deviceId },
    });

    if (!device) {
      return NextResponse.json(
        { ok: false, error: "Perangkat penandatangan belum terdaftar" },
        { status: 400 }
      );
    }

    // Tenant guard: hanya dokumen milik organisasi user yang boleh ditandatangani
    const quotation = await prisma.quotation.findFirst({
      where: { id, organizationId: auth.user.organizationId },
    });
    if (!quotation) {
      return NextResponse.json({ ok: false, error: "Penawaran tidak ditemukan" }, { status: 404 });
    }

    if (quotation.status === "approved") {
      return NextResponse.json({ ok: true, message: "Dokumen sudah disetujui sebelumnya", status: "approved" });
    }

    // Verifikasi bukti penandatanganan: Biometrik ECDSA P-256 ATAU Secure PIN
    let verified = false;

    if (signatureBase64 && device.publicKey) {
      const challenge = createSignatureChallenge(quotation.id, quotation.hash, timestamp);
      verified = verifyBiometricSignature({
        publicKey: device.publicKey,
        challenge,
        signatureBase64,
      });
      if (!verified) {
        return NextResponse.json(
          { ok: false, error: "Tanda tangan biometrik tidak valid atau tidak cocok dengan perangkat terdaftar" },
          { status: 401 }
        );
      }
    } else if (pin && device.pinHash) {
      verified = verifySignerPin(pin, device.pinHash);
      if (!verified) {
        return NextResponse.json({ ok: false, error: "PIN keamanan salah" }, { status: 401 });
      }
    } else {
      // Jika mode simulasi development (belum set biometric key di device)
      if (process.env.NODE_ENV !== "production" && body.simulateApproval === true) {
        verified = true;
      } else {
        return NextResponse.json(
          { ok: false, error: "Bukti tanda tangan biometrik atau PIN wajib dikirimkan" },
          { status: 400 }
        );
      }
    }

    const now = new Date();

    // Transaksi update status dokumen + catat log TTE
    await prisma.$transaction([
      prisma.quotation.update({
        where: { id },
        data: { status: "approved" },
      }),
      prisma.documentSignatureLog.create({
        data: {
          id: uid("siglog"),
          documentType: "quotation",
          documentId: quotation.id,
          signerId: device.id,
          signatureProof: signatureBase64 || `pin_verified:${now.getTime()}`,
          biometricType,
          deviceInfo,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
          latitude,
          longitude,
          signedAt: now,
        },
      }),
    ]);

    await logAudit(auth.user.email, "quotation.sign_mobile", "Quotation", quotation.id, {
      signer: auth.user.name,
      deviceId: device.deviceId,
      biometricType,
      timestamp: now.toISOString(),
    });

    return NextResponse.json({
      ok: true,
      documentId: quotation.id,
      number: quotation.number,
      status: "approved",
      signedBy: auth.user.name,
      signedAt: now.toISOString(),
      biometricType,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses penandatanganan dokumen";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
