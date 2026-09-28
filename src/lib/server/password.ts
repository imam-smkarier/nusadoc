import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hash password memakai scrypt (node:crypto) tanpa dependensi native.
 * Format tersimpan: "<saltHex>:<keyHex>".
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${key}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
