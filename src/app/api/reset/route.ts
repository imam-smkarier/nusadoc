import { NextResponse } from "next/server";
import { forbidden, getSessionUser } from "@/lib/server/auth";
import { loadAllData } from "@/lib/server/map";
import { DEMO_ORG_ID, clearDatabase, seedDatabase } from "@/lib/server/seedDb";
import { prisma } from "@/lib/server/db";

/**
 * Reset data demo workspace — HANYA development, wajib role admin.
 * Endpoint ini tidak boleh tersedia di production.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  if (user.role !== "admin") return forbidden("Hanya admin dapat reset data demo");
  // Seed hanya berisi data workspace demo — tenant lain tidak punya "data demo" untuk dikembalikan.
  if (user.organizationId !== DEMO_ORG_ID) return forbidden("Reset data demo hanya untuk workspace demo");

  await clearDatabase(prisma, DEMO_ORG_ID);
  await seedDatabase(prisma);
  return NextResponse.json(await loadAllData(prisma, user.organizationId));
}
