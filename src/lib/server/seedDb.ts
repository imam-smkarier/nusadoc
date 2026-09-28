import { buildSeedData } from "@/lib/seed";
import { asDate } from "./map";
import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Isi database dengan data demo bila masih kosong (idempotent).
 * Bukan untuk production — production mulai dengan database bersih.
 */
export async function seedIfEmpty(db: PrismaClient): Promise<boolean> {
  const [clients, quotations, invoices] = await Promise.all([
    db.client.count(),
    db.quotation.count(),
    db.invoice.count(),
  ]);
  if (clients > 0 || quotations > 0 || invoices > 0) return false;
  await seedDatabase(db);
  return true;
}

export async function seedDatabase(db: PrismaClient): Promise<void> {
  const s = buildSeedData();

  await db.$transaction([
    ...s.clients.map((c) =>
      db.client.create({
        data: {
          id: c.id, code: c.code, name: c.name, address: c.address, city: c.city,
          npwp: c.npwp, picName: c.picName, picPhone: c.picPhone, picEmail: c.picEmail,
          createdAt: asDate(c.createdAt),
        },
      })
    ),
    ...s.quotations.map((q) =>
      db.quotation.create({
        data: {
          id: q.id, number: q.number, seq: q.seq, status: q.status, clientId: q.clientId,
          subject: q.subject, date: asDate(q.date), validUntil: asDate(q.validUntil),
          items: q.items as unknown as Prisma.InputJsonObject, ppnEnabled: q.tax.ppnEnabled, ppnRate: q.tax.ppnRate,
          pph23Enabled: q.tax.pph23Enabled, pph23Rate: q.tax.pph23Rate, notes: q.notes ?? "",
          token: q.token, hash: q.hash, issuedAt: new Date(q.issuedAt),
        },
      })
    ),
    ...s.invoices.map((i) =>
      db.invoice.create({
        data: {
          id: i.id, number: i.number, seq: i.seq, terminIndex: i.terminIndex ?? null,
          terminLabel: i.terminLabel ?? null, terminPct: i.terminPct ?? null,
          quotationId: i.quotationId ?? null, clientId: i.clientId, subject: i.subject,
          date: asDate(i.date), dueDate: asDate(i.dueDate), items: i.items as unknown as Prisma.InputJsonObject,
          ppnEnabled: i.tax.ppnEnabled, ppnRate: i.tax.ppnRate,
          pph23Enabled: i.tax.pph23Enabled, pph23Rate: i.tax.pph23Rate, notes: i.notes ?? "",
          token: i.token, hash: i.hash, issuedAt: new Date(i.issuedAt),
        },
      })
    ),
    // payment dulu — kwitansi menunjuk payment (FK receipt.paymentId)
    ...s.payments.map((p) =>
      db.payment.create({
        data: {
          id: p.id, invoiceId: p.invoiceId, date: asDate(p.date), amount: BigInt(p.amount),
          method: p.method, note: p.note ?? "",
        },
      })
    ),
    ...s.receipts.map((r) =>
      db.receipt.create({
        data: {
          id: r.id, number: r.number, seq: r.seq, paymentId: r.paymentId, invoiceId: r.invoiceId,
          clientId: r.clientId, amount: BigInt(r.amount), method: r.method, date: asDate(r.date),
          forPaymentOf: r.forPaymentOf, token: r.token, hash: r.hash, issuedAt: new Date(r.issuedAt),
        },
      })
    ),
    ...s.templates.map((t) => db.itemTemplate.create({ data: { id: t.id, name: t.name, items: t.items as unknown as Prisma.InputJsonObject } })),
    db.companySettings.create({
      data: {
        id: "main", name: s.settings.name, tagline: s.settings.tagline, address: s.settings.address,
        city: s.settings.city, phone: s.settings.phone, email: s.settings.email,
        website: s.settings.website, npwp: s.settings.npwp, signName: s.settings.signName,
        signTitle: s.settings.signTitle, signCity: s.settings.signCity,
        ppnDefault: s.settings.ppnDefault, defaultNotesQuotation: s.settings.defaultNotesQuotation,
        defaultNotesInvoice: s.settings.defaultNotesInvoice, banks: s.settings.banks as unknown as Prisma.InputJsonObject,
      },
    }),
  ]);
}

export async function clearDatabase(db: PrismaClient): Promise<void> {
  await db.$transaction([
    // kwitansi dulu — FK receipt.paymentId menunjuk payment
    db.receipt.deleteMany(),
    db.payment.deleteMany(),
    db.invoice.deleteMany(),
    db.quotation.deleteMany(),
    db.client.deleteMany(),
    db.itemTemplate.deleteMany(),
    db.companySettings.deleteMany(),
  ]);
}
