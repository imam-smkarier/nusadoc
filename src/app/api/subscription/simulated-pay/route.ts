import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { logAudit } from "@/lib/server/audit";
import { getSessionUser } from "@/lib/server/auth";
import { getMidtransConfig } from "@/lib/server/midtrans";
import { uid } from "@/lib/utils";

/**
 * Pelunasan simulasi untuk development tanpa kunci Midtrans. Endpoint ini mengubah paket
 * workspace — di production atau saat Midtrans terkonfigurasi ia tidak ada (404), dan hanya
 * admin workspace pemilik order yang boleh memakainya, sekali, untuk order yang masih pending.
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production" || getMidtransConfig().serverKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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
  if (subscription.organizationId) {
    const user = await getSessionUser();
    if (!user || user.organizationId !== subscription.organizationId || user.role !== "admin") {
      return NextResponse.json({ error: "Order ini bukan milik workspace Anda" }, { status: 403 });
    }
  }

  const now = new Date();
  const currentPeriodEnd =
    subscription.interval === "monthly" ? new Date(now.getTime() + 30 * 24 * 3600 * 1000) : null;

  const settled = await prisma.$transaction(async (tx) => {
    // Bersyarat status pending: dua klik/permintaan paralel tidak bisa mengaktifkan dua kali.
    const { count } = await tx.subscription.updateMany({
      where: { id: subscription.id, status: "pending" },
      data: {
        status: "active",
        paidAt: now,
        currentPeriodStart: now,
        currentPeriodEnd,
        paymentType: "simulated_qris",
      },
    });
    if (count === 0) return false;

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
    return true;
  });
  if (!settled) {
    return NextResponse.json({ error: "Order sudah diproses" }, { status: 409 });
  }

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
