import { NextRequest, NextResponse } from "next/server";
import { computeDocumentHash } from "@/lib/hash";
import { mapInvoice, asDate } from "@/lib/server/map";
import { allocateCounter, directInvoiceNumber, ensureCounter, terminInvoiceNumber } from "@/lib/server/sequence";
import { buildClientSnapshot, buildDocSnapshot, buildIssuerSnapshot } from "@/lib/server/snapshot";
import { scaleItems } from "@/lib/calc";
import { isResponse, requirePermission } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";
import { prisma } from "@/lib/server/db";
import { generateToken } from "@/lib/token";
import { invoiceInput, parseOr400 } from "@/lib/server/validation";
import type { DocSnapshot, LineItem } from "@/lib/types";
import type { Prisma } from "@prisma/client";

class DomainError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/**
 * Terbit invoice:
 * - dari penawaran: wajib Disetujui, klien cocok dengan induk, item dihitung
 *   ulang server-side (skala termin), total termin ≤ 100%, nomor termin
 *   memakai identitas penawaran (immutable, anti-collision lintas bulan).
 * - langsung/repeat order: counter bulanan sendiri.
 * Nomor atomik via counter table; snapshot & hash dikunci saat terbit.
 */
export async function POST(req: NextRequest) {
  const user = await requirePermission("invoice.write");
  if (isResponse(user)) return user;
  const body = await req.json();
  const parsed = parseOr400(invoiceInput, body);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  if (!(await prisma.client.findUnique({ where: { id: input.clientId } }))) {
    return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
  }

  const quotation = input.quotationId
    ? await prisma.quotation.findUnique({ where: { id: input.quotationId } })
    : null;
  if (input.quotationId && !quotation) {
    return NextResponse.json({ error: "Penawaran induk tidak ditemukan" }, { status: 404 });
  }
  if (quotation && quotation.status !== "approved") {
    return NextResponse.json(
      { error: "Invoice hanya dapat diterbitkan dari penawaran berstatus Disetujui" },
      { status: 422 }
    );
  }
  if (quotation && input.clientId !== quotation.clientId) {
    return NextResponse.json({ error: "Klien invoice harus sama dengan klien penawaran induk" }, { status: 422 });
  }

  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");

  try {
    // Init counter direct-invoice (autocommit, idempotent)
  const directExisting = await prisma.invoice.findMany({
    where: { terminIndex: null, number: { startsWith: `NTS/INV/${y}/${m}/` } },
    select: { number: true },
  });
  const directInit = directExisting.reduce((mx, r) => Math.max(mx, parseInt(r.number.split("/")[4] || "0", 10) || 0), 0);
  await ensureCounter(prisma, `INV-${y}-${m}`, directInit);

  const { row, number } = await prisma.$transaction(async (tx) => {
      let terminIndex: number | undefined;
      let items: LineItem[] = input.items ?? [];
      let subject = input.subject;

      if (quotation && input.terminPct) {
        // Integritas termin: jumlah seluruh termin aktif + yang baru wajib ≤ 100%.
        const existing = await tx.invoice.findMany({
          where: { quotationId: quotation.id },
          select: { terminPct: true },
        });
        const usedPct = existing.reduce((s, i) => s + (i.terminPct ?? 0), 0);
        if (usedPct + input.terminPct > 100) {
          throw new DomainError(
            `Total termin melebihi 100% — sudah diterbitkan ${usedPct}%, tidak bisa menambah ${input.terminPct}%`,
            422
          );
        }
        // Index termin atomik per penawaran (unik via constraint DB).
        terminIndex = await allocateCounter(tx, `TERM-${quotation.id}`);
        items = scaleItems(quotation.items as unknown as LineItem[], input.terminPct);
        subject = input.subject || quotation.subject;
      }

      let number: string;
      if (quotation && terminIndex) {
        number = terminInvoiceNumber(quotation.number, terminIndex);
      } else {
        number = directInvoiceNumber(y, m, await allocateCounter(tx, `INV-${y}-${m}`));
      }
      const token = generateToken();

      // Snapshot: pewaris dari penawaran bila ada (konsisten dengan induk).
      const quotationSnap = (quotation?.snapshot ?? null) as DocSnapshot | null;
      const issuer = quotationSnap?.issuer ?? (await buildIssuerSnapshot());
      const clientSnap = quotationSnap?.client ?? (await buildClientSnapshot(input.clientId));
      const snapshot = buildDocSnapshot(issuer, clientSnap, items, input.tax);

      const hash = computeDocumentHash("invoice", {
        number, seq: quotation?.seq ?? 0, clientId: input.clientId, subject, date: input.date,
        dueDate: input.dueDate, items, tax: input.tax, notes: input.notes ?? "",
        quotationId: quotation?.id ?? null, terminIndex: terminIndex ?? null,
        terminLabel: input.terminLabel ?? null, terminPct: input.terminPct ?? null,
      });

      const row = await tx.invoice.create({
        data: {
          id: `inv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
          number, seq: quotation?.seq ?? 0, terminIndex: terminIndex ?? null,
          terminLabel: input.terminLabel ?? null, terminPct: input.terminPct ?? null,
          quotationId: quotation?.id ?? null, clientId: input.clientId, subject,
          date: asDate(input.date), dueDate: asDate(input.dueDate),
          items: items as unknown as Prisma.InputJsonObject,
          ppnEnabled: input.tax.ppnEnabled, ppnRate: input.tax.ppnRate,
          pph23Enabled: input.tax.pph23Enabled, pph23Rate: input.tax.pph23Rate,
          notes: input.notes ?? "", token, hash,
          snapshot: snapshot as unknown as Prisma.InputJsonObject,
        },
      });
      return { row, number };
    });

    await logAudit(user.email, "invoice.publish", "Invoice", row.id, {
      number, quotationId: quotation?.id ?? null, terminPct: input.terminPct ?? null,
    });
    return NextResponse.json(mapInvoice(row), { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
