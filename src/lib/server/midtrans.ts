import crypto from "node:crypto";
import { PLAN_CATALOG, type PlanId } from "@/lib/plans";

export type PlanKey = "lite" | "bulanan" | "hakguna";

export interface PlanMeta {
  id: PlanKey;
  name: string;
  amount: number;
  interval: "monthly" | "lifetime";
  durationDays: number | null;
  description: string;
}

export const SUBSCRIPTION_PLANS: Record<PlanKey, PlanMeta> = {
  lite: {
    id: "lite",
    name: PLAN_CATALOG.lite.name,
    amount: PLAN_CATALOG.lite.priceIdr ?? 50_000,
    interval: "monthly",
    durationDays: 30,
    description: "Langganan Nusadoc Lite — 25 Dokumen/Bulan untuk Usaha Kecil",
  },
  bulanan: {
    id: "bulanan",
    name: PLAN_CATALOG.bulanan.name,
    amount: PLAN_CATALOG.bulanan.priceIdr ?? 249_000,
    interval: "monthly",
    durationDays: 30,
    description: "Langganan Nusadoc Cloud — 3 Pengguna & Dokumen Tanpa Batas",
  },
  hakguna: {
    id: "hakguna",
    name: PLAN_CATALOG.hakguna.name,
    amount: PLAN_CATALOG.hakguna.priceIdr ?? 19_900_000,
    interval: "lifetime",
    durationDays: null,
    description: "Lisensi Nusadoc On-Premise Sekali Bayar Selamanya (PT. SMKarier Inovasi Digital)",
  },
};

export function getMidtransConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || process.env.MIDTRANS_CLIENT_KEY || "";
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  const snapApiUrl = isProduction
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const snapScriptUrl = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  return {
    serverKey,
    clientKey,
    isProduction,
    snapApiUrl,
    snapScriptUrl,
    isConfigured: Boolean(serverKey && clientKey),
  };
}

export interface CreateSnapTransactionInput {
  orderId: string;
  grossAmount: number;
  customerDetails: {
    name: string;
    email: string;
    phone?: string;
  };
  itemDetails: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
}

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
  simulated?: boolean;
}

/**
 * Buat transaksi Midtrans Snap via REST API.
 * Bila MIDTRANS_SERVER_KEY belum diisi, fallback ke mode simulasi aman agar development tetap berjalan.
 */
export async function createSnapTransaction(input: CreateSnapTransactionInput): Promise<SnapTransactionResult> {
  const config = getMidtransConfig();

  if (!config.isConfigured) {
    // Mode simulasi development bila server key belum diatur
    const mockToken = `mock-snap-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    return {
      token: mockToken,
      redirectUrl: `/api/subscription/simulated-pay?order_id=${encodeURIComponent(input.orderId)}`,
      simulated: true,
    };
  }

  const authHeader = `Basic ${Buffer.from(`${config.serverKey}:`).toString("base64")}`;

  const payload = {
    transaction_details: {
      order_id: input.orderId,
      gross_amount: Math.round(input.grossAmount),
    },
    customer_details: {
      first_name: input.customerDetails.name,
      email: input.customerDetails.email,
      phone: input.customerDetails.phone || undefined,
    },
    item_details: input.itemDetails.map((item) => ({
      id: item.id,
      price: Math.round(item.price),
      quantity: item.quantity,
      name: item.name.slice(0, 50),
    })),
  };

  const res = await fetch(config.snapApiUrl, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": authHeader,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Midtrans API error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { token: string; redirect_url: string };
  return {
    token: data.token,
    redirectUrl: data.redirect_url,
    simulated: false,
  };
}

/**
 * Verifikasi signature notifikasi webhook Midtrans:
 * SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  const config = getMidtransConfig();

  // Webhook simulasi hanya untuk development tanpa server key — production selalu wajib signature asli.
  if (process.env.NODE_ENV !== "production" && !config.serverKey && params.signatureKey === "simulated") {
    return true;
  }

  if (!config.serverKey) {
    return false;
  }

  const raw = `${params.orderId}${params.statusCode}${params.grossAmount}${config.serverKey}`;
  const computed = crypto.createHash("sha512").update(raw).digest("hex");

  const given = Buffer.from(params.signatureKey);
  return given.length === computed.length && crypto.timingSafeEqual(Buffer.from(computed), given);
}
