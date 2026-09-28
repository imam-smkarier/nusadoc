/**
 * Peta izin per-fitur — dipakai server (guard API) dan client (gating UI).
 * Role: admin (semua) | finance (finansial penuh) | sales (pra-tagihan) | viewer (baca).
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["*"],
  finance: [
    "clients.write",
    "quotation.write",
    "quotation.send",
    "quotation.decide",
    "invoice.write",
    "payment.write",
    "template.write",
  ],
  sales: ["clients.write", "quotation.write", "quotation.send", "template.write"],
  viewer: [],
};

export function can(role: string | undefined | null, action: string): boolean {
  const perms = ROLE_PERMISSIONS[role ?? ""];
  if (!perms) return false;
  return perms.includes("*") || perms.includes(action);
}
