import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { loadAllData } from "@/lib/server/map";
import { seedIfEmpty } from "@/lib/server/seedDb";
import { isResponse, requireUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/** Satu panggilan awal: seluruh data + autoseed demo bila database masih kosong. */
export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  try {
    if (process.env.NODE_ENV !== "production") {
      await seedIfEmpty(prisma);
    }
    const data = await loadAllData(prisma);
    return NextResponse.json(data);
  } catch (e) {
    console.error("bootstrap gagal:", e);
    return NextResponse.json({ error: "Database tidak terjangkau" }, { status: 503 });
  }
}
