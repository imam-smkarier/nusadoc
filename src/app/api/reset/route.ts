import { NextResponse } from "next/server";
import { forbidden, getSessionUser } from "@/lib/server/auth";
import { loadAllData } from "@/lib/server/map";
import { clearDatabase, seedDatabase } from "@/lib/server/seedDb";
import { prisma } from "@/lib/server/db";

/**
 * Reset data demo — HANYA development, wajib role admin.
 * Endpoint ini tidak boleh tersedia di production.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }
  if (user.role !== "admin") return forbidden("Hanya admin dapat reset data demo");

  await clearDatabase(prisma);
  await seedDatabase(prisma);
  return NextResponse.json(await loadAllData(prisma));
}
