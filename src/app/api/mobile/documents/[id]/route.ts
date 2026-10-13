import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { requireMobileUser } from "@/lib/server/mobile-auth";
import { computeTotals } from "@/lib/calc";
import { createSignatureChallenge } from "@/lib/server/biometric-verify";
import type { LineItem, DocSnapshot } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    // Cari sebagai quotation terlebih dahulu — wajib milik organisasi user
    const quotation = await prisma.quotation.findFirst({
      where: { id, organizationId: auth.user.organizationId },
      include: { client: true },
    });

    if (quotation) {
      const items = quotation.items as unknown as LineItem[];
      const totals = computeTotals(items, {
        ppnEnabled: quotation.ppnEnabled,
        ppnRate: quotation.ppnRate,
        pph23Enabled: quotation.pph23Enabled,
        pph23Rate: quotation.pph23Rate,
      });

      const timestamp = Date.now();
      const challenge = createSignatureChallenge(quotation.id, quotation.hash, timestamp);

      return NextResponse.json({
        ok: true,
        document: {
          id: quotation.id,
          kind: "quotation",
          number: quotation.number,
          status: quotation.status,
          subject: quotation.subject,
          date: quotation.date.toISOString().slice(0, 10),
          validUntil: quotation.validUntil.toISOString().slice(0, 10),
          client: quotation.client,
          items,
          tax: {
            ppnEnabled: quotation.ppnEnabled,
            ppnRate: quotation.ppnRate,
            pph23Enabled: quotation.pph23Enabled,
            pph23Rate: quotation.pph23Rate,
          },
          totals,
          token: quotation.token,
          hash: quotation.hash,
          notes: quotation.notes,
          snapshot: quotation.snapshot as DocSnapshot | null,
        },
        signatureChallenge: {
          challenge,
          timestamp,
        },
      });
    }

    // Cari sebagai invoice jika bukan quotation — wajib milik organisasi user
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: auth.user.organizationId },
      include: { client: true, quotation: true, payments: true },
    });

    if (invoice) {
      const items = invoice.items as unknown as LineItem[];
      const totals = computeTotals(items, {
        ppnEnabled: invoice.ppnEnabled,
        ppnRate: invoice.ppnRate,
        pph23Enabled: invoice.pph23Enabled,
        pph23Rate: invoice.pph23Rate,
      });

      const paid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
      const timestamp = Date.now();
      const challenge = createSignatureChallenge(invoice.id, invoice.hash, timestamp);

      return NextResponse.json({
        ok: true,
        document: {
          id: invoice.id,
          kind: "invoice",
          number: invoice.number,
          terminIndex: invoice.terminIndex,
          terminLabel: invoice.terminLabel,
          terminPct: invoice.terminPct,
          subject: invoice.subject,
          date: invoice.date.toISOString().slice(0, 10),
          dueDate: invoice.dueDate.toISOString().slice(0, 10),
          client: invoice.client,
          quotationNumber: invoice.quotation?.number ?? null,
          items,
          tax: {
            ppnEnabled: invoice.ppnEnabled,
            ppnRate: invoice.ppnRate,
            pph23Enabled: invoice.pph23Enabled,
            pph23Rate: invoice.pph23Rate,
          },
          totals: {
            ...totals,
            paid,
            outstanding: Math.max(0, totals.total - paid),
          },
          token: invoice.token,
          hash: invoice.hash,
          notes: invoice.notes,
        },
        signatureChallenge: {
          challenge,
          timestamp,
        },
      });
    }

    return NextResponse.json({ ok: false, error: "Dokumen tidak ditemukan" }, { status: 404 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat dokumen";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
