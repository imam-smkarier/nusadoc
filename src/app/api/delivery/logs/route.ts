import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { requirePermission, isResponse } from "@/lib/server/auth";

/**
 * GET /api/delivery/logs?take=20 — riwayat pengiriman email/WhatsApp.
 */
export async function GET(req: NextRequest) {
  const user = await requirePermission("settings.update");
  if (isResponse(user)) return user;

  const take = Math.min(Number(new URL(req.url).searchParams.get("take")) || 20, 100);
  const logs = await prisma.deliveryLog.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({
    ok: true,
    logs: logs.map((l) => ({
      id: l.id,
      channel: l.channel,
      target: l.target,
      subject: l.subject,
      status: l.status,
      error: l.error,
      relatedType: l.relatedType,
      relatedId: l.relatedId,
      createdAt: l.createdAt,
    })),
  });
}
