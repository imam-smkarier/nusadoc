import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { requireMobileUser } from "@/lib/server/mobile-auth";
import { can } from "@/lib/permissions";
import { computeTotals } from "@/lib/calc";
import { allocateCounter, ensureCounter, receiptNumber } from "@/lib/server/sequence";
import { generateToken } from "@/lib/token";
import { computeDocumentHash } from "@/lib/hash";
import { buildDocSnapshot, buildIssuerSnapshot } from "@/lib/server/snapshot";
import { assertCanPublish } from "@/lib/server/plan";
import { logAudit } from "@/lib/server/audit";
import { deliverDocument } from "@/lib/server/deliver-doc";
import { uid } from "@/lib/utils";
import type { LineItem, DocSnapshot } from "@/lib/types";
import type { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  if (!can(auth.user.role, "payment.write")) {
    return NextResponse.json(
      { ok: false, error: `Peran ${auth.user.role} tidak berizin untuk mencatat pembayaran` },
      { status: 403 }
    );
  }

  try {
    const orgId = auth.user.organizationId;

    // Kuota paket (kwitansi = dokumen terbit)
    const quotaBlocked = await assertCanPublish(orgId);
    if (quotaBlocked) return quotaBlocked;

    const body = await req.json();
    const invoiceId = String(body.invoiceId ?? "").trim();
    const amount = Number(body.amount) || 0;
    const method = String(body.method ?? "Transfer Bank");
    const dateStr = String(body.date ?? new Date().toISOString().slice(0, 10));
    const note = body.note ? String(body.note).trim() : "Dicatat via Nusadoc Mobile";

    if (!invoiceId || amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "invoiceId dan amount (> 0) wajib diisi" },
        { status: 400 }
      );
    }

    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const counterKey = `${orgId}:KWT-${y}-${m}`;

    const existing = await prisma.receipt.findMany({
      where: { organizationId: orgId, number: { startsWith: `NSD/KWT/${y}/${m}/` } },
      select: { number: true },
    });
    const initSeq = existing.reduce(
      (mx, r) => Math.max(mx, parseInt(r.number.split("/")[4] || "0", 10) || 0),
      0
    );
    await ensureCounter(prisma, counterKey, initSeq);

    const { payment, receipt } = await prisma.$transaction(async (tx) => {
      // Tenant guard: invoice milik organisasi user
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, organizationId: orgId },
      });
      if (!invoice) throw new Error("Invoice tidak ditemukan");

      const paid = await tx.payment.aggregate({ where: { invoiceId }, _sum: { amount: true } });
      const total = computeTotals(invoice.items as unknown as LineItem[], {
        ppnEnabled: invoice.ppnEnabled,
        ppnRate: invoice.ppnRate,
        pph23Enabled: invoice.pph23Enabled,
        pph23Rate: invoice.pph23Rate,
      }).total;
      const outstanding = total - Number(paid._sum.amount ?? BigInt(0));

      if (amount > outstanding) {
        throw new Error(`Nominal melebihi sisa tagihan — sisa Rp ${outstanding.toLocaleString("id-ID")}`);
      }

      const seq = await allocateCounter(tx, counterKey);
      const number = receiptNumber(y, m, seq);
      const token = generateToken();

      const invoiceSnap = (invoice.snapshot ?? null) as DocSnapshot | null;
      const issuer = invoiceSnap?.issuer ?? (await buildIssuerSnapshot(orgId));
      const clientSnap =
        invoiceSnap?.client ?? { name: "", address: "", city: "", npwp: "", picName: "", picPhone: "", picEmail: "" };
      const forPaymentOf = `Pelunasan tagihan invoice ${invoice.number}`;

      const snapshot = buildDocSnapshot(issuer, clientSnap, [], {
        ppnEnabled: false,
        ppnRate: 0,
        pph23Enabled: false,
        pph23Rate: 0,
      });
      snapshot.totals.total = amount;

      const paymentId = uid("pay");
      const receiptId = uid("rcp");
      const hash = computeDocumentHash("receipt", {
        number,
        seq,
        paymentId,
        invoiceId,
        clientId: invoice.clientId,
        amount,
        method,
        date: dateStr,
        forPaymentOf,
      });

      const p = await tx.payment.create({
        data: {
          id: paymentId,
          organizationId: orgId,
          invoiceId,
          date: new Date(`${dateStr}T00:00:00.000Z`),
          amount: BigInt(amount),
          method,
          note,
        },
      });

      const r = await tx.receipt.create({
        data: {
          id: receiptId,
          organizationId: orgId,
          number,
          seq,
          paymentId: p.id,
          invoiceId,
          clientId: invoice.clientId,
          amount: BigInt(amount),
          method,
          date: new Date(`${dateStr}T00:00:00.000Z`),
          forPaymentOf,
          token,
          hash,
          snapshot: snapshot as unknown as Prisma.InputJsonObject,
        },
      });

      return { payment: p, receipt: r };
    });

    await logAudit(auth.user.email, "receipt.issue_mobile", "Receipt", receipt.id, {
      number: receipt.number,
      invoiceId,
      amount,
      method,
    });

    // Auto-delivery
    deliverDocument(req.nextUrl.origin, {
      organizationId: receipt.organizationId,
      kind: "Kwitansi",
      number: receipt.number,
      token: receipt.token,
      clientId: receipt.clientId,
      subject: receipt.forPaymentOf,
      total: amount,
      relatedId: receipt.id,
      relatedType: "receipt",
    });

    return NextResponse.json({
      ok: true,
      payment: {
        id: payment.id,
        invoiceId: payment.invoiceId,
        amount: Number(payment.amount),
        method: payment.method,
        date: payment.date.toISOString().slice(0, 10),
      },
      receipt: {
        id: receipt.id,
        number: receipt.number,
        amount: Number(receipt.amount),
        token: receipt.token,
        hash: receipt.hash,
        verificationUrl: `${req.nextUrl.origin}/v/${receipt.token}`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mencatat pembayaran";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
