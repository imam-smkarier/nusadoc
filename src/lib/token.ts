/**
 * Token validasi acak — TIDAK berurutan, agar dokumen klien lain
 * tidak bisa ditebak. Format: NTS-XXXX-XXXX-XXXX (Crockford base32 tanpa I/L/O/U).
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomChars(n: number): string {
  const buf = new Uint32Array(n);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 0xffffffff);
  }
  return Array.from(buf, (v) => ALPHABET[v % ALPHABET.length]).join("");
}

export function generateToken(): string {
  return `NTS-${randomChars(4)}-${randomChars(4)}-${randomChars(4)}`;
}

/** URL halaman validasi publik untuk sebuah token. */
export function validationUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/v/${token}`;
}
