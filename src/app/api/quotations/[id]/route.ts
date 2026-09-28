import { NextRequest, NextResponse } from "next/server";
import { mapQuotation } from "@/lib/server/map";
import { isResponse, requireUser } from "@/lib/server/auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/server/audit";
import { prisma } from "@/lib/server/db";
import { parseOr400, quotationStatusInput } from "@/lib/server/validation";

/**
 * State machine status penawaran (server-side):
 *   draft → sent
 *   sent  → approved | rejected
 * Kedaluwarsa dihitung otomatis dari tanggal, tidak pernah di-set manual.
 */
const TRANSITIONS: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["approved", "rejected"],
  approved: [],
  rejected: [],
  expired: [],
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const { id } = await params;
  const parsed = parseOr400(quotationStatusInput, await req.json());
  if (!parsed.ok) return parsed.response;
  const { status } = parsed.data;

  // RBAC per transisi: sales hanya boleh mengirim, persetujuan butuh quotation.decide
  const needed = status === "sent" ? "quotation.send" : "quotation.decide";
  const me = await requireUser();
  if (isResponse(me)) return me;
  if (!can(me.role, needed)) return NextResponse.json({ error: `Peran ${me.role} tidak berizin untuk ${needed}` }, { status: 403 });

  const existing = await prisma.quotation.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Penawaran tidak ditemukan" }, { status: 404 });

  if (!(TRANSITIONS[existing.status] ?? []).includes(status)) {
    return NextResponse.json(
      { error: `Transisi status tidak valid: ${existing.status} → ${status}` },
      { status: 422 }
    );
  }

  const row = await prisma.quotation.update({ where: { id }, data: { status } });
  await logAudit(user.email, "quotation.status", "Quotation", id, { from: existing.status, to: status });
  return NextResponse.json(mapQuotation(row));
}
