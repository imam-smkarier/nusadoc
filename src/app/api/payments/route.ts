import { NextRequest, NextResponse } from "next/server";
import { computeDocumentHash } from "@/lib/hash";
import { mapPayment, mapReceipt, asDate } from "@/lib/server/map";
import { allocateCounter, ensureCounter, receiptNumber } from "@/lib/server/sequence";
import { buildDocSnapshot, buildIssuerSnapshot } from "@/lib/server/snapshot";
import { computeTotals } from "@/lib/calc";
import { isResponse, requirePermission } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";
import { prisma } from "@/lib/server/db";
import { generateToken } from "@/lib/token";
import { parseOr400, paymentInput } from "@/lib/server/validation";
import type { DocSnapshot, LineItem } from "@/lib/types";
import type { Prisma } from "@prisma/client";

class DomainError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/**
 * Catat pembayaran → kwitansi otomatis terbit (sekali final).
 * Transaksi server-side: outstanding dihitung dari database, overpayment
 * ditolak (422), nomor atomik via counter (FOR UPDATE), snapshot & hash
 * dikunci saat terbit.
 */
export async function POST(req: NextRequest) {
  const user = await requirePermission("payment.write");
  if (isResponse(user)) return user;
  const body = await req.json();
  const parsed = parseOr400(paymentInput, body);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;
  const invoiceId = String(body?.invoiceId ?? "");
  if (!invoiceId) return NextResponse.json({ error: "invoiceId wajib" }, { status: 400 });

  // Init counter kwitansi (autocommit, idempotent) dari nomor tertinggi bulan ini
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const existing = await prisma.receipt.findMany({
    where: { number: { startsWith: `NTS/KWT/${y}/${m}/` } },
    select: { number: true },
  });
  const initSeq = existing.reduce((mx, r) => Math.max(mx, parseInt(r.number.split("/")[4] || "0", 10) || 0), 0);
  await ensureCounter(prisma, `KWT-${y}-${m}`, initSeq);

  try {
    const { payment, receipt } = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new DomainError("Invoice tidak ditemukan", 404);

      const paid = await tx.payment.aggregate({ where: { invoiceId }, _sum: { amount: true } });
      const total = computeTotals(invoice.items as unknown as LineItem[], {
        ppnEnabled: invoice.ppnEnabled, ppnRate: invoice.ppnRate,
        pph23Enabled: invoice.pph23Enabled, pph23Rate: invoice.pph23Rate,
      }).total;
      const outstanding = total - Number(paid._sum.amount ?? BigInt(0));
      if (input.amount > outstanding) {
        throw new DomainError(
          `Nominal melebihi sisa tagihan — sisa Rp ${outstanding.toLocaleString("id-ID")}`,
          422
        );
      }

      const seq = await allocateCounter(tx, `KWT-${y}-${m}`);
      const number = receiptNumber(y, m, seq);
      const token = generateToken();

      // Snapshot kwitansi mewarisi snapshot invoice (rantai dokumen konsisten)
      const invoiceSnap = (invoice.snapshot ?? null) as DocSnapshot | null;
      const issuer = invoiceSnap?.issuer ?? (await buildIssuerSnapshot());
      const clientSnap =
        invoiceSnap?.client ?? { name: "", address: "", city: "", npwp: "", picName: "", picPhone: "", picEmail: "" };
      const forPaymentOf = input.forPaymentOf ?? `${invoice.subject} — s.n. ${invoice.number}`;
      const snapshot = buildDocSnapshot(issuer, clientSnap, [], {
        ppnEnabled: false, ppnRate: 0, pph23Enabled: false, pph23Rate: 0,
      });
      snapshot.totals.total = input.amount; // nilai kwitansi = nominal diterima

      const paymentId = `pay_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const receiptId = `rcp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const hash = computeDocumentHash("receipt", {
        number, seq, paymentId, invoiceId, clientId: invoice.clientId,
        amount: input.amount, method: input.method, date: input.date, forPaymentOf,
      });

      const p = await tx.payment.create({
        data: {
          id: paymentId, invoiceId, date: asDate(input.date), amount: BigInt(input.amount),
          method: input.method, note: input.note ?? "",
        },
      });
      const r = await tx.receipt.create({
        data: {
          id: receiptId, number, seq, paymentId: p.id, invoiceId, clientId: invoice.clientId,
          amount: BigInt(input.amount), method: input.method, date: asDate(input.date),
          forPaymentOf, token, hash,
          snapshot: snapshot as unknown as Prisma.InputJsonObject,
        },
      });
      return { payment: { ...p, receipt: r }, receipt: r };
    });

    await logAudit(user.email, "receipt.issue", "Receipt", receipt.id, {
      number: receipt.number, invoiceId, amount: input.amount, method: input.method,
    });
    return NextResponse.json({ payment: mapPayment(payment), receipt: mapReceipt(receipt) }, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
