import type { Client, CompanySettings, DocSnapshot } from "@/lib/types";
import { computeTotals } from "@/lib/calc";
import type { LineItem, TaxConfig } from "@/lib/types";
import { prisma } from "./db";

/** Kunci snapshot penerbit + klien saat terbit. */
export async function buildIssuerSnapshot(): Promise<DocSnapshot["issuer"]> {
  const s = await prisma.companySettings.findFirst();
  return {
    name: s?.name ?? "", tagline: s?.tagline ?? "", address: s?.address ?? "", city: s?.city ?? "",
    phone: s?.phone ?? "", email: s?.email ?? "", website: s?.website ?? "", npwp: s?.npwp ?? "",
    signName: s?.signName ?? "", signTitle: s?.signTitle ?? "", signCity: s?.signCity ?? "",
    banks: (s?.banks ?? []) as unknown as CompanySettings["banks"],
  };
}

export async function buildClientSnapshot(clientId: string): Promise<DocSnapshot["client"]> {
  const c = await prisma.client.findUnique({ where: { id: clientId } });
  return {
    name: c?.name ?? "", address: c?.address ?? "", city: c?.city ?? "", npwp: c?.npwp ?? "",
    picName: c?.picName ?? "", picPhone: c?.picPhone ?? "", picEmail: c?.picEmail ?? "",
  };
}

export function buildDocSnapshot(
  issuer: DocSnapshot["issuer"],
  client: DocSnapshot["client"],
  items: LineItem[],
  tax: TaxConfig
): DocSnapshot {
  return { issuer, client, totals: computeTotals(items, tax) };
}
