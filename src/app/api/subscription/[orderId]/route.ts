import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { SUBSCRIPTION_PLANS, PlanKey } from "@/lib/server/midtrans";

/**
 * Status pembayaran per order — dipakai halaman sukses untuk polling.
 * Endpoint publik dengan data minimal (tanpa token Snap & email penuh).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  const sub = await prisma.subscription.findUnique({
    where: { orderId },
    select: {
      orderId: true,
      plan: true,
      status: true,
      amount: true,
      interval: true,
      paymentType: true,
      paidAt: true,
      currentPeriodEnd: true,
      customerName: true,
    },
  });

  if (!sub) {
    return NextResponse.json({ ok: false, error: "Order tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    order: {
      orderId: sub.orderId,
      plan: sub.plan,
      planName: SUBSCRIPTION_PLANS[sub.plan as PlanKey]?.name ?? sub.plan,
      status: sub.status,
      amount: Number(sub.amount),
      interval: sub.interval,
      paymentType: sub.paymentType,
      paidAt: sub.paidAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      customerName: sub.customerName,
    },
  });
}
