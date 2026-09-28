import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { mapSettings } from "@/lib/server/map";
import { logAudit } from "@/lib/server/audit";
import { isResponse, requirePermission } from "@/lib/server/auth";
import { prisma } from "@/lib/server/db";
import type { CompanySettings } from "@/lib/types";

export async function PUT(req: NextRequest) {
  const user = await requirePermission("settings.update");
  if (isResponse(user)) return user;
  const s = (await req.json()) as CompanySettings;
  const data = {
    name: String(s.name ?? ""), tagline: String(s.tagline ?? ""), address: String(s.address ?? ""),
    city: String(s.city ?? ""), phone: String(s.phone ?? ""), email: String(s.email ?? ""),
    website: String(s.website ?? ""), npwp: String(s.npwp ?? ""), signName: String(s.signName ?? ""),
    signTitle: String(s.signTitle ?? ""), signCity: String(s.signCity ?? ""),
    ppnDefault: !!s.ppnDefault, defaultNotesQuotation: String(s.defaultNotesQuotation ?? ""),
    defaultNotesInvoice: String(s.defaultNotesInvoice ?? ""), banks: (s.banks ?? []) as unknown as Prisma.InputJsonValue,
  };
  const row = await prisma.companySettings.upsert({
    where: { id: "main" },
    update: data,
    create: { id: "main", ...data },
  });
  await logAudit(user.email, "settings.update", "CompanySettings", row.id);
  return NextResponse.json(mapSettings(row));
}
