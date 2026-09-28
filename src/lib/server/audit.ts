import { prisma } from "./db";
import type { Prisma } from "@prisma/client";
import { uid } from "@/lib/utils";

/** Catat aksi penting (publish, status, payment, settings) — actor dari sesi server. */
export async function logAudit(
  actor: string,
  action: string,
  entity: string,
  entityId: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { id: uid("log"), actor, action, entity, entityId, meta: (meta ?? {}) as unknown as Prisma.InputJsonObject },
    });
  } catch (e) {
    // Audit tidak boleh memblokir operasi utama, tapi wajib terlihat di log server.
    console.error("audit gagal:", e);
  }
}
