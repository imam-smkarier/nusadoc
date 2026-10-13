import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { SUBSCRIPTION_PLANS, PlanKey, getMidtransConfig } from "@/lib/server/midtrans";
import { getSessionUser } from "@/lib/server/auth";
import { getOrgEntitlements, summarizeEntitlements } from "@/lib/server/plan";

export async function GET() {
  try {
    const config = getMidtransConfig();
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({
        ok: true,
        active: false,
        subscription: null,
        entitlements: null,
        history: [],
        midtransClientKey: config.clientKey,
        isConfigured: config.isConfigured,
      });
    }

    const orgId = user.organizationId;
    const [ent, activeSub, history] = await Promise.all([
      getOrgEntitlements(orgId),
      prisma.subscription.findFirst({
        where: { organizationId: orgId, status: "active" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.subscription.findMany({
        where: { organizationId: orgId },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderId: true,
          plan: true,
          status: true,
          amount: true,
          interval: true,
          paidAt: true,
          createdAt: true,
        },
      }),
    ]);

    const formattedHistory = history.map((h) => ({
      ...h,
      amount: Number(h.amount),
      planName: SUBSCRIPTION_PLANS[h.plan as PlanKey]?.name ?? h.plan,
    }));

    return NextResponse.json({
      ok: true,
      active: ent.status === "active",
      entitlements: summarizeEntitlements(ent),
      subscription: activeSub
        ? {
            id: activeSub.id,
            orderId: activeSub.orderId,
            plan: activeSub.plan,
            planName: SUBSCRIPTION_PLANS[activeSub.plan as PlanKey]?.name ?? activeSub.plan,
            status: activeSub.status,
            amount: Number(activeSub.amount),
            interval: activeSub.interval,
            currentPeriodStart: activeSub.currentPeriodStart,
            currentPeriodEnd: activeSub.currentPeriodEnd,
            paidAt: activeSub.paidAt,
            customerName: activeSub.customerName,
            customerEmail: activeSub.customerEmail,
          }
        : null,
      history: formattedHistory,
      midtransClientKey: config.clientKey,
      isConfigured: config.isConfigured,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memuat status langganan";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
