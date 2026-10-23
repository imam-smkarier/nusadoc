import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { verifyMidtransSignature } from "@/lib/server/midtrans";
import { logAudit } from "@/lib/server/audit";
import { uid } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const orderId = String(body.order_id ?? "");
    const statusCode = String(body.status_code ?? "");
    const grossAmount = String(body.gross_amount ?? "");
    const signatureKey = String(body.signature_key ?? "");
    const transactionStatus = String(body.transaction_status ?? "");
    const paymentType = String(body.payment_type ?? "midtrans");
    const fraudStatus = body.fraud_status ? String(body.fraud_status) : undefined;

    if (!orderId || !statusCode || !grossAmount || !signatureKey) {
      return NextResponse.json({ error: "Missing required notification fields" }, { status: 400 });
    }

    const isValidSignature = verifyMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      signatureKey,
    });

    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { orderId },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription order not found" }, { status: 404 });
    }

    const isSettled =
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && (!fraudStatus || fraudStatus === "accept"));

    if (isSettled) {
      if (subscription.status === "active") {
        return NextResponse.json({ ok: true, message: "Subscription already active" });
      }

      const now = new Date();
      const currentPeriodEnd =
        subscription.interval === "monthly" ? new Date(now.getTime() + 30 * 24 * 3600 * 1000) : null;

      // Workspace hanya dari order itu sendiri (diikat saat checkout oleh admin yang login) —
      // jangan menautkan lewat email pembeli, karena email bisa diketik siapa saja.
      const orgId = subscription.organizationId;
      const userId = subscription.userId;

      await prisma.$transaction(async (tx) => {
        // 1. Update subscription status
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            organizationId: orgId,
            userId,
            status: "active",
            paidAt: now,
            currentPeriodStart: now,
            currentPeriodEnd,
            paymentType,
          },
        });

        // 2. Jika terhubung ke organisasi, perbarui plan organisasi ke paket berbayar!
        if (orgId) {
          await tx.organization.update({
            where: { id: orgId },
            data: {
              plan: subscription.plan,
              trialEndsAt: null, // Hapus masa trial karena sudah upgrade
            },
          });
        }

        // 3. Catat subscription log
        await tx.subscriptionLog.create({
          data: {
            id: uid("sublog"),
            subscriptionId: subscription.id,
            event: "payment.settled",
            status: "active",
            rawPayload: body,
          },
        });
      });

      await logAudit("midtrans-webhook", "subscription.settle", "Subscription", subscription.id, {
        plan: subscription.plan,
        orderId: subscription.orderId,
        amount: subscription.amount.toString(),
        paymentType,
        organizationId: orgId,
      });

      return NextResponse.json({ ok: true, status: "active", organizationId: orgId });
    }

    if (transactionStatus === "pending") {
      await prisma.subscriptionLog.create({
        data: {
          id: uid("sublog"),
          subscriptionId: subscription.id,
          event: "payment.pending",
          status: "pending",
          rawPayload: body,
        },
      });
      return NextResponse.json({ ok: true, status: "pending" });
    }

    if (["deny", "cancel", "expire"].includes(transactionStatus)) {
      const newStatus = transactionStatus === "expire" ? "expired" : "cancelled";

      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: newStatus },
        }),
        prisma.subscriptionLog.create({
          data: {
            id: uid("sublog"),
            subscriptionId: subscription.id,
            event: `payment.${transactionStatus}`,
            status: newStatus,
            rawPayload: body,
          },
        }),
      ]);

      await logAudit("midtrans-webhook", `subscription.${newStatus}`, "Subscription", subscription.id, {
        plan: subscription.plan,
        orderId: subscription.orderId,
      });

      return NextResponse.json({ ok: true, status: newStatus });
    }

    return NextResponse.json({ ok: true, status: transactionStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error processing webhook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
