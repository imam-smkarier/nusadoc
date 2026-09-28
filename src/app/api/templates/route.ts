import { NextRequest, NextResponse } from "next/server";
import { mapTemplate } from "@/lib/server/map";
import { parseOr400, templateInput } from "@/lib/server/validation";
import { prisma } from "@/lib/server/db";
import { isResponse, requirePermission } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  const user = await requirePermission("template.write");
  if (isResponse(user)) return user;
  const parsed = parseOr400(templateInput, await req.json());
  if (!parsed.ok) return parsed.response;
  const { name, items } = parsed.data;
  const row = await prisma.itemTemplate.create({
    data: {
      id: `tpl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      name: String(name), items,
    },
  });
  return NextResponse.json(mapTemplate(row), { status: 201 });
}
