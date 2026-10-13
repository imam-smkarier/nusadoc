import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { requireMobileUser } from "@/lib/server/mobile-auth";
import { computeTotals } from "@/lib/calc";
import type { LineItem } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const quotations = await prisma.quotation.findMany({
      where: { organizationId: auth.user.organizationId, status: { in: ["sent", "draft"] } },
      orderBy: { issuedAt: "desc" },
      include: {
        client: { select: { id: true, name: true, city: true } },
      },
    });

    const pending = quotations.map((q) => {
      const totals = computeTotals(q.items as unknown as LineItem[], {
        ppnEnabled: q.ppnEnabled,
        ppnRate: q.ppnRate,
        pph23Enabled: q.pph23Enabled,
        pph23Rate: q.pph23Rate,
      });

      return {
        id: q.id,
        kind: "quotation",
        number: q.number,
        status: q.status,
        subject: q.subject,
        clientName: q.client.name,
        clientCity: q.client.city,
        date: q.date.toISOString().slice(0, 10),
        validUntil: q.validUntil.toISOString().slice(0, 10),
        total: totals.total,
        hash: q.hash,
        itemCount: (q.items as unknown[]).length,
      };
    });

    return NextResponse.json({ ok: true, pending });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat persetujuan tertunda";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
