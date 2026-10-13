import { NextRequest, NextResponse } from "next/server";
import { computeDocumentHash } from "@/lib/hash";
import { mapQuotation, asDate } from "@/lib/server/map";
import { allocateCounter, ensureCounter, quotationNumber } from "@/lib/server/sequence";
import { buildClientSnapshot, buildDocSnapshot, buildIssuerSnapshot } from "@/lib/server/snapshot";
import { isResponse, requirePermission } from "@/lib/server/auth";
import { assertCanPublish } from "@/lib/server/plan";
import { logAudit } from "@/lib/server/audit";
import { prisma } from "@/lib/server/db";
import { generateToken } from "@/lib/token";
import { parseOr400, quotationInput } from "@/lib/server/validation";
import type { Prisma } from "@prisma/client";

/**
 * Terbit penawaran (tenant-scoped): kuota paket ditegakkan server-side,
 * penomoran atomik per organisasi (counter `org:QUO-YYYY-MM`),
 * token & hash kanonik, snapshot penerbit/klien dikunci saat terbit.
 */
export async function POST(req: NextRequest) {
  const user = await requirePermission("quotation.write");
  if (isResponse(user)) return user;
  const orgId = user.organizationId;

  // Kuota & status langganan (402 bila expired / kuota habis)
  const quotaBlocked = await assertCanPublish(orgId);
  if (quotaBlocked) return quotaBlocked;

  const body = await req.json();
  const parsed = parseOr400(quotationInput, body);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  // Tenant guard: klien wajib milik organisasi yang sama
  const client = await prisma.client.findFirst({
    where: { id: input.clientId, organizationId: orgId },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
  }

  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const counterKey = `${orgId}:QUO-${y}-${m}`;

  // Init counter (autocommit, idempotent) dari nomor tertinggi milik org bulan ini
  const existing = await prisma.quotation.findMany({
    where: { organizationId: orgId, number: { startsWith: `NSD/QUO/${y}/${m}/` } },
    select: { number: true },
  });
  const initSeq = existing.reduce((mx, r) => Math.max(mx, parseInt(r.number.split("/")[4] || "0", 10) || 0), 0);
  await ensureCounter(prisma, counterKey, initSeq);

  const { row, number } = await prisma.$transaction(async (tx) => {
    const seq = await allocateCounter(tx, counterKey);
    const number = quotationNumber(y, m, seq);
    const token = generateToken();
    const issuer = await buildIssuerSnapshot(orgId);
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
        organizationId: orgId,
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
