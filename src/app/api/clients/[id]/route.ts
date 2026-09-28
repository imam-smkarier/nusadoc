import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { mapClient } from "@/lib/server/map";
import { isResponse, requirePermission } from "@/lib/server/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("clients.write");
  if (isResponse(user)) return user;
  const { id } = await params;
  const body = await req.json();
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
