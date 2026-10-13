import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { createSnapTransaction, SUBSCRIPTION_PLANS, PlanKey } from "@/lib/server/midtrans";
import { parseOr400, subscriptionCheckoutInput } from "@/lib/server/validation";
import { getSessionUser } from "@/lib/server/auth";
import { uid } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = parseOr400(subscriptionCheckoutInput, raw);
    if (!parsed.ok) return parsed.response;

    const { plan, customerName, customerEmail, customerPhone } = parsed.data;
    const planMeta = SUBSCRIPTION_PLANS[plan as PlanKey];

    // Cek apakah user sedang login di web
    const loggedUser = await getSessionUser();
    let organizationId: string | null = loggedUser?.organizationId ?? null;
    let userId: string | null = loggedUser?.id ?? null;

    // Jika guest checkout dari landing page, coba cocokkan email dengan user terdaftar
    if (!organizationId) {
      const existingUser = await prisma.user.findUnique({
        where: { email: customerEmail.toLowerCase() },
        select: { id: true, organizationId: true },
      });
      if (existingUser) {
        organizationId = existingUser.organizationId;
        userId = existingUser.id;
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderId = `NSD-SUB-${todayStr}-${randSuffix}`;

    const snapResult = await createSnapTransaction({
      orderId,
      grossAmount: planMeta.amount,
      customerDetails: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone || undefined,
      },
      itemDetails: [
        {
          id: planMeta.id,
          name: planMeta.name,
          price: planMeta.amount,
          quantity: 1,
        },
      ],
    });

    const subscription = await prisma.subscription.create({
      data: {
        id: uid("sub"),
        organizationId,
        userId,
        plan: planMeta.id,
        status: "pending",
        amount: BigInt(planMeta.amount),
        interval: planMeta.interval,
        orderId,
        snapToken: snapResult.token,
        snapRedirectUrl: snapResult.redirectUrl,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        logs: {
          create: {
            id: uid("sublog"),
            event: "snap.created",
            status: "pending",
            rawPayload: {
              simulated: snapResult.simulated ?? false,
              plan: planMeta.id,
              amount: planMeta.amount,
              organizationId,
            },
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      orderId: subscription.orderId,
      token: snapResult.token,
      redirectUrl: snapResult.redirectUrl,
      simulated: snapResult.simulated ?? false,
      organizationId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses checkout langganan";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
