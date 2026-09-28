import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Skema validasi server-side — satu-satunya gerbang input untuk endpoint dokumen.
 * UI validation hanyalah kenyamanan; aturan finansial ditegakkan di sini.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
  .refine((s) => !Number.isNaN(new Date(`${s}T00:00:00.000Z`).getTime()), "Tanggal tidak valid");

const lineItem = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1, "Nama item wajib").max(200),
  description: z.string().max(500).optional(),
  qty: z.number().int("Qty harus bilangan bulat").positive("Qty harus > 0").max(1_000_000),
  unit: z.string().trim().min(1).max(30),
  unitPrice: z
    .number()
    .int("Harga harus rupiah bulat")
    .min(0)
    .max(1_000_000_000_000),
});

const taxConfig = z.object({
  ppnEnabled: z.boolean(),
  ppnRate: z.number().int().min(0).max(25),
  pph23Enabled: z.boolean(),
  pph23Rate: z.number().int().min(0).max(100),
});

export const quotationInput = z
  .object({
    clientId: z.string().min(1),
    subject: z.string().trim().min(3, "Perihal minimal 3 karakter").max(300),
    date: isoDate,
    validUntil: isoDate,
    items: z.array(lineItem).min(1, "Minimal satu item"),
    tax: taxConfig,
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => d.validUntil >= d.date, {
    message: "Masa berlaku tidak boleh sebelum tanggal dokumen",
    path: ["validUntil"],
  });

export const invoiceInput = z
  .object({
    clientId: z.string().min(1),
    subject: z.string().trim().min(3).max(300),
    date: isoDate,
    dueDate: isoDate,
    items: z.array(lineItem).default([]),
    tax: taxConfig,
    notes: z.string().max(2000).optional(),
    quotationId: z.string().min(1).optional(),
    terminLabel: z.string().trim().min(1).max(120).optional(),
    terminPct: z.number().int().min(1).max(100).optional(),
  })
  .refine((d) => d.dueDate >= d.date, {
    message: "Jatuh tempo tidak boleh sebelum tanggal invoice",
    path: ["dueDate"],
  })
  .refine((d) => (d.terminPct ? !!d.quotationId : true), {
    message: "Persentase termin hanya berlaku untuk invoice dari penawaran",
    path: ["terminPct"],
  })
  .refine(
    (d) => (d.quotationId ? d.items.length > 0 || !!d.terminPct : d.items.length > 0),
    { message: "Minimal satu item", path: ["items"] }
  );

export const paymentInput = z.object({
  date: isoDate,
  amount: z.number().int("Nominal harus rupiah bulat").positive("Nominal harus > 0").max(1_000_000_000_000),
  method: z.enum(["Transfer Bank", "Tunai", "QRIS", "Virtual Account", "Cek/Giro"]),
  note: z.string().max(500).optional(),
  forPaymentOf: z.string().max(300).optional(),
});

export const quotationStatusInput = z.object({
  status: z.enum(["draft", "sent", "approved", "rejected"]),
});

export const clientInput = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(500),
  city: z.string().max(100).optional(),
  npwp: z.string().max(40).optional(),
  picName: z.string().max(120).optional(),
  picPhone: z.string().max(40).optional(),
  picEmail: z.string().max(120).optional(),
});

export const templateInput = z.object({
  name: z.string().trim().min(1).max(120),
  items: z.array(lineItem).min(1),
});

/** Bantu handler: balikkan 422 terformat bila payload tidak valid. */
export function parseOr400<T>(
  schema: z.ZodType<T>,
  body: unknown
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const result = schema.safeParse(body);
  if (result.success) return { ok: true, data: result.data };
  const first = result.error.issues[0];
  const path = first.path.length ? `${first.path.join(".")}: ` : "";
  return {
    ok: false,
    response: NextResponse.json({ error: `${path}${first.message}` }, { status: 422 }),
  };
}
