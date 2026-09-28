import { NextRequest, NextResponse } from "next/server";
import { computeDocumentHash } from "@/lib/hash";
import { mapQuotation, asDate } from "@/lib/server/map";
import { allocateCounter, ensureCounter, quotationNumber } from "@/lib/server/sequence";
import { buildClientSnapshot, buildDocSnapshot, buildIssuerSnapshot } from "@/lib/server/snapshot";
import { isResponse, requirePermission } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";
import { prisma } from "@/lib/server/db";
import { generateToken } from "@/lib/token";
import { parseOr400, quotationInput } from "@/lib/server/validation";
import type { Prisma } from "@prisma/client";

/**
 * Terbit penawaran: penomoran atomik (counter table, pola LAST_INSERT_ID),
 * token & hash kanonik, snapshot penerbit/klien dikunci saat terbit.
 */
export async function POST(req: NextRequest) {
  const user = await requirePermission("quotation.write");
  if (isResponse(user)) return user;
  const body = await req.json();
  const parsed = parseOr400(quotationInput, body);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  if (!(await prisma.client.findUnique({ where: { id: input.clientId } }))) {
    return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
  }

  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");

  // Init counter (autocommit, idempotent) dari nomor tertinggi yang sudah ada
  const existing = await prisma.quotation.findMany({
    where: { number: { startsWith: `NTS/QUO/${y}/${m}/` } },
    select: { number: true },
  });
  const initSeq = existing.reduce((mx, r) => Math.max(mx, parseInt(r.number.split("/")[4] || "0", 10) || 0), 0);
  await ensureCounter(prisma, `QUO-${y}-${m}`, initSeq);

  const { row, number } = await prisma.$transaction(async (tx) => {
    const seq = await allocateCounter(tx, `QUO-${y}-${m}`);
    const number = quotationNumber(y, m, seq);
    const token = generateToken();
    const issuer = await buildIssuerSnapshot();
    const clientSnap = await buildClientSnapshot(input.clientId);
    const snapshot = buildDocSnapshot(issuer, clientSnap, input.items, input.tax);
    const hash = computeDocumentHash("quotation", {
      number, seq, clientId: input.clientId, subject: input.subject,
      date: input.date, validUntil: input.validUntil, items: input.items,
      tax: input.tax, notes: input.notes ?? "",
    });

    const row = await tx.quotation.create({
      data: {
        id: `quo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        number, seq, status: "draft", clientId: input.clientId, subject: input.subject,
        date: asDate(input.date), validUntil: asDate(input.validUntil),
        items: input.items as unknown as Prisma.InputJsonObject,
        ppnEnabled: input.tax.ppnEnabled, ppnRate: input.tax.ppnRate,
        pph23Enabled: input.tax.pph23Enabled, pph23Rate: input.tax.pph23Rate,
        notes: input.notes ?? "", token, hash,
        snapshot: snapshot as unknown as Prisma.InputJsonObject,
      },
    });
    return { row, number };
  });

  await logAudit(user.email, "quotation.publish", "Quotation", row.id, { number });
  return NextResponse.json(mapQuotation(row), { status: 201 });
}
