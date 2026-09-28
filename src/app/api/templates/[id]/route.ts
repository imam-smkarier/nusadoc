import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { isResponse, requirePermission } from "@/lib/server/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("template.write");
  if (isResponse(user)) return user;
  const { id } = await params;
  await prisma.itemTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
