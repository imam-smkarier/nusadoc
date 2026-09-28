import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Pastikan baris counter ada — dijalankan AUTOCOMMIT di luar transaksi
 * (idempotent). Dipisah dari alokasi agar tidak terjadi deadlock antar
 * transaksi paralel pada INSERT IGNORE yang sama.
 */
export async function ensureCounter(db: PrismaClient, key: string, initValue = 0): Promise<void> {
  await db.$executeRaw`INSERT IGNORE INTO DocumentCounter (\`key\`, value) VALUES (${key}, ${initValue})`;
}

/**
 * Alokasi nomor urut atomik: SELECT ... FOR UPDATE (locking read — selalu
 * baca nilai terkini & kunci baris sampai commit) lalu UPDATE. Transaksi
 * lain otomatis antre di baris yang sama; tunggal sumber lock → tanpa deadlock.
 */
export async function allocateCounter(tx: Tx, key: string, initValue = 0): Promise<number> {
  const rows = await tx.$queryRaw<{ value: bigint | number }[]>`SELECT value FROM DocumentCounter WHERE \`key\` = ${key} FOR UPDATE`;
  const next = Math.max(Number(rows[0]?.value ?? 0), initValue) + 1;
  await tx.$executeRaw`UPDATE DocumentCounter SET value = ${next} WHERE \`key\` = ${key}`;
  return next;
}

const pad3 = (n: number) => String(n).padStart(3, "0");

export function quotationNumber(y: string, m: string, seq: number): string {
  return `NTS/QUO/${y}/${m}/${pad3(seq)}`;
}

export function directInvoiceNumber(y: string, m: string, seq: number): string {
  return `NTS/INV/${y}/${m}/${pad3(seq)}`;
}

/**
 * Identitas invoice termin diambil dari nomor penawaran (immutable):
 * NTS/QUO/2026/08/001 + termin 2 → NTS/INV/2026/08/001-T2
 * (memperbaiki collision lintas bulan yang dilaporkan audit).
 */
export function terminInvoiceNumber(quotationNumber: string, terminIndex: number): string {
  const [, , y, m, seq] = quotationNumber.split("/");
  return `NTS/INV/${y}/${m}/${seq}-T${terminIndex}`;
}

export function receiptNumber(y: string, m: string, seq: number): string {
  return `NTS/KWT/${y}/${m}/${pad3(seq)}`;
}
