import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { mapClient } from "@/lib/server/map";
import { clientInput, parseOr400 } from "@/lib/server/validation";
import { todayISO } from "@/lib/utils";
import { isResponse, requirePermission } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const user = await requirePermission("clients.write");
  if (isResponse(user)) return user;
  const parsed = parseOr400(clientInput, await req.json());
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const count = await prisma.client.count();
  const client = await prisma.client.create({
    data: {
      id: `cli_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      code: `CL-${String(count + 1).padStart(3, "0")}`,
      name: String(body.name),
      address: String(body.address),
      city: String(body.city ?? ""),
      npwp: String(body.npwp ?? ""),
      picName: String(body.picName ?? ""),
      picPhone: String(body.picPhone ?? ""),
      picEmail: String(body.picEmail ?? ""),
      createdAt: new Date(`${todayISO()}T00:00:00.000Z`),
    },
  });
  return NextResponse.json(mapClient(client), { status: 201 });
}
