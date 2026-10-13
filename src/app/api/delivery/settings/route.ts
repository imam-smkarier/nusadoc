import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { requirePermission, isResponse } from "@/lib/server/auth";
import { encryptSecret, hasSecret } from "@/lib/server/secret";

/**
 * GET  /api/delivery/settings — konfigurasi delivery (kredensial tidak dikembalikan plaintext).
 * PUT  /api/delivery/settings — simpan konfigurasi (admin only).
 */
export async function GET() {
  const user = await requirePermission("settings.update");
  if (isResponse(user)) return user;

  const settings = await prisma.deliverySettings.findUnique({
    where: { organizationId: user.organizationId },
  });
  if (!settings) {
    const created = await prisma.deliverySettings.create({
      data: { id: `dlv_${user.organizationId}`, organizationId: user.organizationId },
    });
    return NextResponse.json({ ok: true, settings: toSafeDto(created) });
  }
  return NextResponse.json({ ok: true, settings: toSafeDto(settings) });
}

export async function PUT(req: NextRequest) {
  const user = await requirePermission("settings.update");
  if (isResponse(user)) return user;

  try {
    const body = await req.json();

    const data: Record<string, unknown> = {
      emailEnabled: Boolean(body.emailEnabled),
      smtpHost: String(body.smtpHost ?? "").trim(),
      smtpPort: Math.min(Math.max(Number(body.smtpPort) || 587, 1), 65535),
      smtpSecure: Boolean(body.smtpSecure),
      smtpUser: String(body.smtpUser ?? "").trim(),
      smtpFromName: String(body.smtpFromName ?? "Nusadoc").trim() || "Nusadoc",
      smtpFromEmail: String(body.smtpFromEmail ?? "").trim(),
      waEnabled: Boolean(body.waEnabled),
      waProvider: body.waProvider === "wablas" ? "wablas" : "fonnte",
      waAdminPhone: String(body.waAdminPhone ?? "").trim(),
      autoSendOnPublish: Boolean(body.autoSendOnPublish),
      autoSendOnPayment: Boolean(body.autoSendOnPayment),
      reminderDaysBeforeDue: Math.min(Math.max(Number(body.reminderDaysBeforeDue) || 0, 0), 30),
    };

    // Password/token hanya diperbarui bila field dikirim (kosong berarti tidak diubah).
    if (typeof body.smtpPassword === "string" && body.smtpPassword.length > 0) {
      data.smtpPasswordEnc = encryptSecret(body.smtpPassword);
    }
    if (typeof body.waToken === "string" && body.waToken.length > 0) {
      data.waTokenEnc = encryptSecret(body.waToken);
    }

    const settings = await prisma.deliverySettings.upsert({
      where: { organizationId: user.organizationId },
      update: data,
      create: { id: `dlv_${user.organizationId}`, organizationId: user.organizationId, ...data },
    });

    return NextResponse.json({ ok: true, settings: toSafeDto(settings) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan konfigurasi delivery";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** DTO aman untuk UI — kredensial direpresentasikan sebagai boolean "terisi". */
function toSafeDto(s: {
  emailEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPasswordEnc: string;
  smtpFromName: string;
  smtpFromEmail: string;
  waEnabled: boolean;
  waProvider: string;
  waTokenEnc: string;
  waAdminPhone: string;
  autoSendOnPublish: boolean;
  autoSendOnPayment: boolean;
  reminderDaysBeforeDue: number;
}) {
  return {
    emailEnabled: s.emailEnabled,
    smtpHost: s.smtpHost,
    smtpPort: s.smtpPort,
    smtpSecure: s.smtpSecure,
    smtpUser: s.smtpUser,
    smtpPasswordSet: hasSecret(s.smtpPasswordEnc),
    smtpFromName: s.smtpFromName,
    smtpFromEmail: s.smtpFromEmail,
    waEnabled: s.waEnabled,
    waProvider: s.waProvider,
    waTokenSet: hasSecret(s.waTokenEnc),
    waAdminPhone: s.waAdminPhone,
    autoSendOnPublish: s.autoSendOnPublish,
    autoSendOnPayment: s.autoSendOnPayment,
    reminderDaysBeforeDue: s.reminderDaysBeforeDue,
  };
}
