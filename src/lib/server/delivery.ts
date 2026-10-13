import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/server/db";
import { decryptSecret } from "@/lib/server/secret";
import { uid } from "@/lib/utils";

/**
 * Delivery service — Email (SMTP/Nodemailer) & WhatsApp (Fonnte/WaBlas API).
 * Semua pengiriman dicatat di DeliveryLog; kegagalan tidak menggagalkan alur dokumen (fire-and-forget dengan log).
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  relatedType?: "quotation" | "invoice" | "receipt" | "test" | "reminder";
  relatedId?: string;
}

export interface SendWaInput {
  phone: string;
  message: string;
  relatedType?: "quotation" | "invoice" | "receipt" | "test" | "reminder";
  relatedId?: string;
}

export async function getDeliverySettings(organizationId: string) {
  let settings = await prisma.deliverySettings.findUnique({ where: { organizationId } });
  if (!settings) {
    settings = await prisma.deliverySettings.create({
      data: { id: `dlv_${organizationId}`, organizationId },
    });
  }
  return settings;
}

async function logDelivery(params: {
  organizationId: string;
  channel: "email" | "whatsapp";
  target: string;
  subject?: string;
  status: "sent" | "failed";
  error?: string;
  relatedType?: string;
  relatedId?: string;
}) {
  try {
    await prisma.deliveryLog.create({
      data: {
        id: uid("dlog"),
        organizationId: params.organizationId,
        channel: params.channel,
        target: params.target,
        subject: params.subject ?? "",
        status: params.status,
        error: params.error ?? null,
        relatedType: params.relatedType ?? null,
        relatedId: params.relatedId ?? null,
      },
    });
  } catch {
    // Log delivery tidak boleh menggagalkan flow utama
  }
}

async function buildTransport(settings: Awaited<ReturnType<typeof getDeliverySettings>>): Promise<Transporter> {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: settings.smtpUser
      ? { user: settings.smtpUser, pass: decryptSecret(settings.smtpPasswordEnc) }
      : undefined,
  });
}

export async function sendEmail(input: SendEmailInput & { organizationId: string }): Promise<{ ok: boolean; error?: string }> {
  const settings = await getDeliverySettings(input.organizationId);
  if (!settings.emailEnabled) {
    return { ok: false, error: "Email delivery belum diaktifkan di Pengaturan." };
  }
  if (!settings.smtpHost) {
    return { ok: false, error: "SMTP host belum dikonfigurasi." };
  }

  const fromEmail = settings.smtpFromEmail || settings.smtpUser;

  try {
    const transport = await buildTransport(settings);
    await transport.sendMail({
      from: `"${settings.smtpFromName || "Nusadoc"}" <${fromEmail}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    await logDelivery({
      organizationId: input.organizationId,
      channel: "email",
      target: input.to,
      subject: input.subject,
      status: "sent",
      relatedType: input.relatedType,
      relatedId: input.relatedId,
    });
    return { ok: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Gagal mengirim email";
    await logDelivery({
      organizationId: input.organizationId,
      channel: "email",
      target: input.to,
      subject: input.subject,
      status: "failed",
      error,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
    });
    return { ok: false, error };
  }
}

export async function sendWhatsApp(input: SendWaInput & { organizationId: string }): Promise<{ ok: boolean; error?: string }> {
  const settings = await getDeliverySettings(input.organizationId);
  if (!settings.waEnabled) {
    return { ok: false, error: "WhatsApp delivery belum diaktifkan di Pengaturan." };
  }

  const token = decryptSecret(settings.waTokenEnc);
  if (!token) {
    return { ok: false, error: "Token WhatsApp gateway belum dikonfigurasi." };
  }

  // Normalisasi nomor: 08xx → 628xx
  let phone = input.phone.replace(/[^0-9+]/g, "");
  if (phone.startsWith("08")) phone = `62${phone.slice(1)}`;
  else if (phone.startsWith("+62")) phone = phone.slice(1);
  else if (phone.startsWith("62")) phone = phone;
  else if (phone.startsWith("8")) phone = `62${phone}`;

  try {
    let res: Response;
    if (settings.waProvider === "wablas") {
      res = await fetch(`https://console.wablas.com/api/send-message`, {
        method: "POST",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, message: input.message }),
      });
    } else {
      // Fonnte (default)
      res = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target: phone, message: input.message }),
      });
    }

    if (!res.ok) {
      const bodyText = await res.text();
      throw new Error(`WA gateway error (${res.status}): ${bodyText.slice(0, 200)}`);
    }

    await logDelivery({
      organizationId: input.organizationId,
      channel: "whatsapp",
      target: phone,
      subject: input.message.slice(0, 100),
      status: "sent",
      relatedType: input.relatedType,
      relatedId: input.relatedId,
    });
    return { ok: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Gagal mengirim WhatsApp";
    await logDelivery({
      organizationId: input.organizationId,
      channel: "whatsapp",
      target: phone,
      subject: input.message.slice(0, 100),
      status: "failed",
      error,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
    });
    return { ok: false, error };
  }
}

/* ── Template pesan dokumen ── */

export function buildDocEmailHtml(params: {
  docKind: string;
  docNumber: string;
  clientName: string;
  subjectLine: string;
  total: string;
  dueDate?: string;
  verifyUrl: string;
  issuerName: string;
}): string {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
    <div style="border-bottom: 3px solid #087ed4; padding-bottom: 12px; margin-bottom: 20px;">
      <span style="font-size: 20px; font-weight: bold; color: #0b2341;">Nusa<span style="color: #087ed4;">doc</span></span>
      <span style="float: right; font-size: 12px; color: #94a3b8;">${params.issuerName}</span>
    </div>
    <p style="font-size: 14px;">Yth. <strong>${params.clientName}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6;">
      Berikut kami sampaikan <strong>${params.docKind}</strong> dengan nomor
      <strong style="font-family: monospace;">${params.docNumber}</strong> — ${params.subjectLine}.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
      <tr style="background: #f4f7fa;">
        <td style="padding: 10px 12px; font-weight: bold;">Nilai Dokumen</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: bold;">${params.total}</td>
      </tr>
      ${params.dueDate ? `<tr><td style="padding: 10px 12px;">Jatuh Tempo</td><td style="padding: 10px 12px; text-align: right;">${params.dueDate}</td></tr>` : ""}
    </table>
    <p style="font-size: 13px;">
      Dokumen dapat diverifikasi keasliannya (QR &amp; hash SHA-256) melalui tautan berikut:
    </p>
    <p style="font-size: 13px;">
      <a href="${params.verifyUrl}" style="color: #087ed4; font-weight: bold; word-break: break-all;">${params.verifyUrl}</a>
    </p>
    <p style="font-size: 13px; line-height: 1.6;">Terima kasih atas kepercayaan Anda.</p>
    <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 12px; font-size: 11px; color: #94a3b8;">
      Email otomatis dari sistem Nusadoc · PT. SMKarier Inovasi Digital
    </div>
  </div>`;
}

export function buildDocWaMessage(params: {
  docKind: string;
  docNumber: string;
  clientName: string;
  total: string;
  dueDate?: string;
  verifyUrl: string;
}): string {
  return [
    `*${params.docKind} — ${params.docNumber}*`,
    ``,
    `Yth. ${params.clientName},`,
    ``,
    `Berikut ${params.docKind.toLowerCase()} kami: *${params.total}*${params.dueDate ? ` (jatuh tempo ${params.dueDate})` : ""}.`,
    ``,
    `Verifikasi keaslian dokumen:`,
    params.verifyUrl,
    ``,
    `Terima kasih. 🙏`,
    `_Dikirim otomatis via Nusadoc_`,
  ].join("\n");
}
