import { NextRequest, NextResponse } from "next/server";
import { requirePermission, isResponse } from "@/lib/server/auth";
import { sendEmail, sendWhatsApp, buildDocEmailHtml } from "@/lib/server/delivery";

/**
 * POST /api/delivery/test — kirim pesan tes email & WhatsApp dari admin panel.
 * Body: { email?: string, phone?: string }
 */
export async function POST(req: NextRequest) {
  const user = await requirePermission("settings.update");
  if (isResponse(user)) return user;

  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const results: { email?: { ok: boolean; error?: string }; whatsapp?: { ok: boolean; error?: string } } = {};

    if (email) {
      results.email = await sendEmail({
        organizationId: user.organizationId,
        to: email,
        subject: "Tes Email Delivery — Nusadoc",
        html: buildDocEmailHtml({
          docKind: "Pesan Tes Email",
          docNumber: "TEST/DELIVERY/001",
          clientName: "Admin Nusadoc",
          subjectLine: "uji konfigurasi SMTP pengiriman dokumen",
          total: "Rp 0",
          verifyUrl: `${new URL(req.url).origin}/login`,
          issuerName: "PT. SMKarier Inovasi Digital",
        }),
        text: "Tes email delivery Nusadoc — konfigurasi SMTP berhasil.",
        relatedType: "test",
      });
    }

    if (phone) {
      results.whatsapp = await sendWhatsApp({
        organizationId: user.organizationId,
        phone,
        message: [
          "*Tes WhatsApp Delivery — Nusadoc*",
          "",
          "Konfigurasi WhatsApp gateway berhasil. 🎉",
          "",
          "_Dikirim otomatis via Nusadoc (PT. SMKarier Inovasi Digital)_",
        ].join("\n"),
        relatedType: "test",
      });
    }

    const allOk = Object.values(results).length > 0 && Object.values(results).every((r) => r.ok);
    return NextResponse.json({ ok: allOk, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengirim pesan tes";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
