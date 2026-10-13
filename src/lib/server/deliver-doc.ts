import { prisma } from "@/lib/server/db";
import { sendEmail, sendWhatsApp, buildDocEmailHtml, buildDocWaMessage } from "@/lib/server/delivery";
import { formatRupiah, formatDateShort } from "@/lib/utils";

/**
 * Auto-delivery dokumen (fire-and-forget) — dipanggil setelah dokumen terbit/terkirim.
 * Tidak pernah menggagalkan flow utama; semua kegagalan hanya tercatat di DeliveryLog.
 */

interface DocInfo {
  kind: "Penawaran" | "Invoice" | "Kwitansi";
  number: string;
  token: string;
  clientId: string;
  organizationId: string;
  subject: string;
  total: number;
  dueDate?: string | null;
  relatedId: string;
  relatedType: "quotation" | "invoice" | "receipt";
}

export function deliverDocument(origin: string, doc: DocInfo): void {
  void (async () => {
    try {
      const settings = await prisma.deliverySettings.findUnique({
        where: { organizationId: doc.organizationId },
      });
      if (!settings) return;

      const autoSend = doc.relatedType === "receipt" ? settings.autoSendOnPayment : settings.autoSendOnPublish;
      if (!autoSend) return;

      const client = await prisma.client.findUnique({ where: { id: doc.clientId } });
      if (!client) return;

      const verifyUrl = `${origin}/v/${doc.token}`;
      const total = formatRupiah(doc.total);
      const dueDate = doc.dueDate ? formatDateShort(doc.dueDate.slice(0, 10)) : undefined;
      const orgId = doc.organizationId;

      // Email ke PIC klien
      if (settings.emailEnabled && client.picEmail) {
        await sendEmail({
          organizationId: orgId,
          to: client.picEmail,
          subject: `${doc.kind} ${doc.number} — ${doc.subject}`,
          html: buildDocEmailHtml({
            docKind: doc.kind,
            docNumber: doc.number,
            clientName: client.name,
            subjectLine: `perihal ${doc.subject}`,
            total,
            dueDate,
            verifyUrl,
            issuerName: "PT. SMKarier Inovasi Digital",
          }),
          relatedType: doc.relatedType,
          relatedId: doc.relatedId,
        });
      }

      // WhatsApp ke PIC klien
      if (settings.waEnabled && client.picPhone) {
        await sendWhatsApp({
          organizationId: orgId,
          phone: client.picPhone,
          message: buildDocWaMessage({
            docKind: doc.kind,
            docNumber: doc.number,
            clientName: client.name,
            total,
            dueDate,
            verifyUrl,
          }),
          relatedType: doc.relatedType,
          relatedId: doc.relatedId,
        });
      }

      // Notifikasi admin (WA) saat kwitansi terbit — opsional
      if (doc.relatedType === "receipt" && settings.waEnabled && settings.waAdminPhone) {
        await sendWhatsApp({
          organizationId: orgId,
          phone: settings.waAdminPhone,
          message: `💰 Pembayaran diterima.\n\nKwitansi *${doc.number}*\nNilai: ${total}\nKlien: ${client.name}`,
          relatedType: doc.relatedType,
          relatedId: doc.relatedId,
        });
      }
    } catch {
      // Fire-and-forget — kegagalan delivery tidak memengaruhi respons API dokumen
    }
  })();
}
