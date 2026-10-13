import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { mapClient } from "@/lib/server/map";
import { isResponse, requirePermission } from "@/lib/server/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("clients.write");
  if (isResponse(user)) return user;
  const { id } = await params;
  const row = await prisma.client.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!row) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });
  return NextResponse.json(mapClient(row));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("clients.write");
  if (isResponse(user)) return user;
  const { id } = await params;
  const body = await req.json();

  // Tenant guard: klien milik organisasi lain tidak terlihat sama sekali (404)
  const existing = await prisma.client.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Klien tidak ditemukan" }, { status: 404 });

  const row = await prisma.client.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: String(body.name) }),
      ...(body.address !== undefined && { address: String(body.address) }),
      ...(body.city !== undefined && { city: String(body.city) }),
      ...(body.npwp !== undefined && { npwp: String(body.npwp) }),
      ...(body.picName !== undefined && { picName: String(body.picName) }),
      ...(body.picPhone !== undefined && { picPhone: String(body.picPhone) }),
      ...(body.picEmail !== undefined && { picEmail: String(body.picEmail) }),
    },
  });
  return NextResponse.json(mapClient(row));
}
