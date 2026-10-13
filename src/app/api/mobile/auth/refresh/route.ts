import { NextRequest, NextResponse } from "next/server";
import { refreshMobileAccessToken } from "@/lib/server/mobile-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const refreshToken = String(body.refreshToken ?? "").trim();

    if (!refreshToken) {
      return NextResponse.json({ ok: false, error: "refreshToken wajib diisi" }, { status: 400 });
    }

    const result = await refreshMobileAccessToken(refreshToken);
    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Refresh token tidak valid atau telah kedaluwarsa" },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal refresh token";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
