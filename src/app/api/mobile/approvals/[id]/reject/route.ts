import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { requireMobileUser } from "@/lib/server/mobile-auth";
import { can } from "@/lib/permissions";
import { logAudit } from "@/lib/server/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  if (!can(auth.user.role, "quotation.decide")) {
    return NextResponse.json(
      { ok: false, error: `Peran ${auth.user.role} tidak berizin untuk menolak dokumen` },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const reason = String(body.reason ?? "").trim();

    // Tenant guard: hanya dokumen milik organisasi user
    const quotation = await prisma.quotation.findFirst({
      where: { id, organizationId: auth.user.organizationId },
    });
    if (!quotation) {
      return NextResponse.json({ ok: false, error: "Penawaran tidak ditemukan" }, { status: 404 });
    }

    await prisma.quotation.update({
      where: { id },
      data: { status: "rejected" },
    });

    await logAudit(auth.user.email, "quotation.reject_mobile", "Quotation", quotation.id, {
      rejectedBy: auth.user.name,
      reason: reason || "Ditolak via mobile",
    });

    return NextResponse.json({
      ok: true,
      documentId: quotation.id,
      status: "rejected",
      reason: reason || "Ditolak via mobile",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menolak dokumen";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
