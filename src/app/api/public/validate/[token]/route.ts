import { NextRequest, NextResponse } from "next/server";
import { canonicalJson, documentHashPayload, sha256 } from "@/lib/hash";
import { prisma } from "@/lib/server/db";
import type { Client, CompanySettings, Invoice, Payment, Quotation, Receipt } from "@/lib/types";
import { computeTotals } from "@/lib/calc";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";

export const dynamic = "force-dynamic";

const dateStr = (d: Date) => d.toISOString().slice(0, 10);

function publicClient(c: {
  id: string; name: string; address: string; city: string; npwp: string;
  picName: string; picPhone: string; picEmail: string;
}): Client {
  return { ...c, code: "", createdAt: "" };
}

/**
 * Endpoint validasi publik TOKEN-SCOPED:
 * hanya mengembalikan satu dokumen yang diminta (+ pihak & pengaturan yang
 * tampil di badan dokumen). TIDAK memaparkan arsip global — /api/bootstrap
 * adalah endpoint internal terautentikasi.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!rateLimit(`validate:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 });
  }
  const { token } = await params;

  const quotation = await prisma.quotation.findUnique({ where: { token } });
  const invoice = quotation ? null : await prisma.invoice.findUnique({ where: { token } });
  const receipt = !quotation && !invoice ? await prisma.receipt.findUnique({ where: { token } }) : null;
  if (!quotation && !invoice && !receipt) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  const doc = quotation ?? invoice ?? receipt!;
  const clientRow = await prisma.client.findUnique({ where: { id: doc.clientId } });
  const settingsRow = await prisma.companySettings.findFirst();

  let hashPayload: Record<string, unknown> | null = null;
  let kind: "quotation" | "invoice" | "receipt" = "quotation";
  let docOut: Record<string, unknown> | null = null;
  let payments: Payment[] = [];
  let quotationRef: { number: string; date: string; subject: string } | null = null;
  let invoiceRef: Invoice | null = null;

  if (quotation) {
    kind = "quotation";
    hashPayload = documentHashPayload("quotation", {
      number: quotation.number, seq: quotation.seq, clientId: quotation.clientId,
      subject: quotation.subject, date: dateStr(quotation.date), validUntil: dateStr(quotation.validUntil),
      items: quotation.items,
      tax: { ppnEnabled: quotation.ppnEnabled, ppnRate: quotation.ppnRate, pph23Enabled: quotation.pph23Enabled, pph23Rate: quotation.pph23Rate },
      notes: quotation.notes ?? "",
    });
    docOut = {
      ...quotation, date: dateStr(quotation.date), validUntil: dateStr(quotation.validUntil),
      items: quotation.items,
      tax: { ppnEnabled: quotation.ppnEnabled, ppnRate: quotation.ppnRate, pph23Enabled: quotation.pph23Enabled, pph23Rate: quotation.pph23Rate },
      notes: quotation.notes ?? undefined,
      issuedAt: quotation.issuedAt.toISOString(),
    };
  } else if (invoice) {
    kind = "invoice";
    hashPayload = documentHashPayload("invoice", {
      number: invoice.number, seq: invoice.seq, clientId: invoice.clientId, subject: invoice.subject,
      date: dateStr(invoice.date), dueDate: dateStr(invoice.dueDate), items: invoice.items,
      tax: { ppnEnabled: invoice.ppnEnabled, ppnRate: invoice.ppnRate, pph23Enabled: invoice.pph23Enabled, pph23Rate: invoice.pph23Rate },
      notes: invoice.notes ?? "", quotationId: invoice.quotationId, terminIndex: invoice.terminIndex,
      terminLabel: invoice.terminLabel, terminPct: invoice.terminPct,
    });
    docOut = {
      ...invoice, date: dateStr(invoice.date), dueDate: dateStr(invoice.dueDate),
      items: invoice.items,
      tax: { ppnEnabled: invoice.ppnEnabled, ppnRate: invoice.ppnRate, pph23Enabled: invoice.pph23Enabled, pph23Rate: invoice.pph23Rate },
      notes: invoice.notes ?? undefined, issuedAt: invoice.issuedAt.toISOString(),
    };
    if (invoice.quotationId) {
      const q = await prisma.quotation.findUnique({ where: { id: invoice.quotationId } });
      if (q) quotationRef = { number: q.number, date: dateStr(q.date), subject: q.subject };
    }
    const paymentRows = await prisma.payment.findMany({
      where: { invoiceId: invoice.id }, include: { receipt: true }, orderBy: { date: "asc" },
    });
    payments = paymentRows.map((p) => ({
      id: p.id, invoiceId: p.invoiceId, date: dateStr(p.date), amount: Number(p.amount),
      method: p.method as Payment["method"], note: p.note ?? undefined, receiptId: p.receipt?.id ?? "",
    }));
  } else {
    const r = receipt!;
    kind = "receipt";
    hashPayload = documentHashPayload("receipt", {
      number: r.number, seq: r.seq, paymentId: r.paymentId, invoiceId: r.invoiceId,
      clientId: r.clientId, amount: Number(r.amount), method: r.method, date: dateStr(r.date),
      forPaymentOf: r.forPaymentOf,
    });
    docOut = {
      id: r.id, kind: "receipt", number: r.number, seq: r.seq, paymentId: r.paymentId,
      invoiceId: r.invoiceId, clientId: r.clientId, amount: Number(r.amount), method: r.method,
      date: dateStr(r.date), forPaymentOf: r.forPaymentOf, token: r.token, hash: r.hash,
      snapshot: r.snapshot ?? null,
      issuedAt: r.issuedAt.toISOString(),
    };
    if (r.invoiceId) {
      const inv = await prisma.invoice.findUnique({ where: { id: r.invoiceId } });
      if (inv) {
        invoiceRef = {
          id: inv.id, kind: "invoice", number: inv.number, seq: inv.seq, clientId: inv.clientId,
          subject: inv.subject, date: dateStr(inv.date), dueDate: dateStr(inv.dueDate),
          items: inv.items as unknown as Invoice["items"],
          tax: { ppnEnabled: inv.ppnEnabled, ppnRate: inv.ppnRate, pph23Enabled: inv.pph23Enabled, pph23Rate: inv.pph23Rate },
          token: "", hash: "", issuedAt: inv.issuedAt.toISOString(),
        };
      }
    }
  }

  const hashValid = hashPayload ? sha256(canonicalJson(hashPayload)) === doc.hash : false;
  const settings: CompanySettings = settingsRow
    ? {
        name: settingsRow.name, tagline: settingsRow.tagline, address: settingsRow.address,
        city: settingsRow.city, phone: settingsRow.phone, email: settingsRow.email,
        website: settingsRow.website, npwp: settingsRow.npwp, signName: settingsRow.signName,
        signTitle: settingsRow.signTitle, signCity: settingsRow.signCity, ppnDefault: settingsRow.ppnDefault,
        defaultNotesQuotation: settingsRow.defaultNotesQuotation, defaultNotesInvoice: settingsRow.defaultNotesInvoice,
        banks: (settingsRow.banks ?? []) as unknown as CompanySettings["banks"],
      }
    : null as unknown as CompanySettings;

  return NextResponse.json({
    found: true,
    kind,
    doc: { ...docOut, hashValid },
    client: clientRow ? publicClient(clientRow) : null,
    liveClient: clientRow ? publicClient(clientRow) : null,
    settings,
    quotationRef,
    invoiceRef,
    payments,
    meta: {
      total:
        kind === "quotation"
          ? computeTotals((docOut as unknown as Quotation).items, (docOut as unknown as Quotation).tax).total
          : kind === "invoice"
            ? computeTotals((docOut as unknown as Invoice).items, (docOut as unknown as Invoice).tax).total
            : (docOut as unknown as Receipt).amount,
    },
  });
}
