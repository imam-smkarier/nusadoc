import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { requireMobileUser } from "@/lib/server/mobile-auth";
import { computeTotals } from "@/lib/calc";
import type { LineItem } from "@/lib/types";

export async function GET(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const orgWhere = { organizationId: auth.user.organizationId };

    // 1. Ambil invoice & payment MILIK ORGANISASI untuk kalkulasi piutang
    const [invoices, paymentsThisMonth, pendingQuotationsCount, recentLogs] = await Promise.all([
      prisma.invoice.findMany({
        where: orgWhere,
        select: {
          id: true,
          items: true,
          ppnEnabled: true,
          ppnRate: true,
          pph23Enabled: true,
          pph23Rate: true,
          dueDate: true,
          payments: { select: { amount: true } },
        },
      }),
      prisma.payment.aggregate({
        where: { ...orgWhere, date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.quotation.count({
        where: { ...orgWhere, status: { in: ["sent", "draft"] } },
      }),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { at: "desc" },
        where: { actor: auth.user.email },
        select: { id: true, action: true, entity: true, actor: true, at: true, meta: true },
      }),
    ]);

    let totalOutstanding = 0;
    let overdueCount = 0;

    for (const inv of invoices) {
      const total = computeTotals(inv.items as unknown as LineItem[], {
        ppnEnabled: inv.ppnEnabled,
        ppnRate: inv.ppnRate,
        pph23Enabled: inv.pph23Enabled,
        pph23Rate: inv.pph23Rate,
      }).total;
      const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      const remaining = Math.max(0, total - paid);
      totalOutstanding += remaining;

      if (remaining > 0 && new Date(inv.dueDate) < now) {
        overdueCount += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: auth.user.id,
        name: auth.user.name,
        role: auth.user.role,
        organizationId: auth.user.organizationId,
      },
      metrics: {
        outstandingReceivables: totalOutstanding,
        receivedThisMonth: Number(paymentsThisMonth._sum.amount ?? 0),
        pendingApprovalsCount: pendingQuotationsCount,
        overdueInvoicesCount: overdueCount,
      },
      recentActivity: recentLogs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat dashboard mobile";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
