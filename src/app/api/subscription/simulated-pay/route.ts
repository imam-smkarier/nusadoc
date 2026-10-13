import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { logAudit } from "@/lib/server/audit";
import { uid } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.json({ error: "order_id wajib diisi" }, { status: 400 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { orderId },
  });

  if (!subscription) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  const now = new Date();
  const currentPeriodEnd =
    subscription.interval === "monthly" ? new Date(now.getTime() + 30 * 24 * 3600 * 1000) : null;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "active",
        paidAt: now,
        currentPeriodStart: now,
        currentPeriodEnd,
        paymentType: "simulated_qris",
      },
    });

    if (subscription.organizationId) {
      await tx.organization.update({
        where: { id: subscription.organizationId },
        data: {
          plan: subscription.plan,
          trialEndsAt: null,
        },
      });
    }

    await tx.subscriptionLog.create({
      data: {
        id: uid("sublog"),
        subscriptionId: subscription.id,
        event: "payment.settled",
        status: "active",
        rawPayload: { mode: "simulated" },
      },
    });
  });

  await logAudit("developer-simulation", "subscription.settle", "Subscription", subscription.id, {
    plan: subscription.plan,
    orderId: subscription.orderId,
    mode: "simulated",
  });

  // Business flow simulasi: arahkan ke halaman konfirmasi
  return NextResponse.redirect(
    new URL(`/pembayaran/sukses?order_id=${encodeURIComponent(orderId)}`, req.url)
  );
}
