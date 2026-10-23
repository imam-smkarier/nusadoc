import { NextRequest, NextResponse } from "next/server";
import { computeDocumentHash } from "@/lib/hash";
import { mapInvoice, asDate } from "@/lib/server/map";
import { allocateCounter, directInvoiceNumber, ensureCounter, terminInvoiceNumber } from "@/lib/server/sequence";
import { buildClientSnapshot, buildDocSnapshot, buildIssuerSnapshot } from "@/lib/server/snapshot";
import { scaleItems } from "@/lib/calc";
import { isResponse, requirePermission } from "@/lib/server/auth";
import { assertCanPublish } from "@/lib/server/plan";
import { logAudit } from "@/lib/server/audit";
import { prisma } from "@/lib/server/db";
import { generateToken } from "@/lib/token";
import { invoiceInput, parseOr400 } from "@/lib/server/validation";
import { deliverDocument } from "@/lib/server/deliver-doc";
import { computeTotals } from "@/lib/calc";
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
  const orgId = user.organizationId;

  // Kuota & status langganan (402 bila expired / kuota habis)
  const quotaBlocked = await assertCanPublish(orgId);
  if (quotaBlocked) return quotaBlocked;

  const body = await req.json();
  const parsed = parseOr400(invoiceInput, body);
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

  const quotation = input.quotationId
    ? await prisma.quotation.findFirst({
        where: { id: input.quotationId, organizationId: orgId },
      })
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
  const counterKey = `${orgId}:INV-${y}-${m}`;

  try {
    // Init counter direct-invoice (autocommit, idempotent) — milik org bulan ini
  const directExisting = await prisma.invoice.findMany({
    where: { organizationId: orgId, terminIndex: null, number: { startsWith: `NSD/INV/${y}/${m}/` } },
    select: { number: true },
  });
  const directInit = directExisting.reduce((mx, r) => Math.max(mx, parseInt(r.number.split("/")[4] || "0", 10) || 0), 0);
  await ensureCounter(prisma, counterKey, directInit);

  // Counter termin per penawaran: baris wajib ada sebelum alokasi. Init dari termin tertinggi
  // yang sudah terbit — penawaran lama (T1/T2 tanpa baris counter) melanjutkan ke T3, bukan bentrok di T1.
  const terminKey = quotation ? `TERM-${quotation.id}` : null;
  if (quotation && terminKey) {
    const maxTermin = await prisma.invoice.aggregate({
      _max: { terminIndex: true },
      where: { quotationId: quotation.id },
    });
    await ensureCounter(prisma, terminKey, maxTermin._max.terminIndex ?? 0);
  }

  const { row, number } = await prisma.$transaction(async (tx) => {
      let terminIndex: number | undefined;
      let items: LineItem[] = input.items ?? [];
      let subject = input.subject;

      if (quotation && input.terminPct && terminKey) {
        // Kunci counter termin DULU (locking read): request paralel untuk penawaran yang sama
        // antre di sini, jadi total termin di bawah sudah memuat termin yang baru di-commit.
        // Bila ditolak, transaksi rollback dan counter ikut kembali.
        terminIndex = await allocateCounter(tx, terminKey);
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
        items = scaleItems(quotation.items as unknown as LineItem[], input.terminPct);
        subject = input.subject || quotation.subject;
      }

      let number: string;
      if (quotation && terminIndex) {
        number = terminInvoiceNumber(quotation.number, terminIndex);
      } else {
        number = directInvoiceNumber(y, m, await allocateCounter(tx, counterKey));
      }
      const token = generateToken();

      // Snapshot: pewaris dari penawaran bila ada (konsisten dengan induk).
      const quotationSnap = (quotation?.snapshot ?? null) as DocSnapshot | null;
      const issuer = quotationSnap?.issuer ?? (await buildIssuerSnapshot(orgId));
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
          organizationId: orgId,
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

    // Auto-delivery: invoice dikirim ke klien saat terbit
    deliverDocument(req.nextUrl.origin, {
      organizationId: row.organizationId,
      kind: "Invoice",
      number: row.number,
      token: row.token,
      clientId: row.clientId,
      subject: row.subject,
      total: computeTotals(row.items as unknown as LineItem[], {
        ppnEnabled: row.ppnEnabled, ppnRate: row.ppnRate,
        pph23Enabled: row.pph23Enabled, pph23Rate: row.pph23Rate,
      }).total,
      dueDate: row.dueDate.toISOString(),
      relatedId: row.id,
      relatedType: "invoice",
    });

    return NextResponse.json(mapInvoice(row), { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
