import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";
import { createSession, sessionCookieOptions } from "@/lib/server/auth";
import { rateLimit, clientIp } from "@/lib/server/rateLimit";
import { logAudit } from "@/lib/server/audit";
import { TRIAL_DAYS } from "@/lib/plans";

/**
 * Registrasi SaaS — buat Organization (trial 30 hari) + User owner (role admin)
 * + CompanySettings awal dalam SATU transaksi, lalu auto-login.
 * 1 email = 1 akun (email unik global menjamin 1 trial per email).
 */

const registerInput = z.object({
  companyName: z.string().trim().min(3, "Nama perusahaan minimal 3 karakter").max(120),
  name: z.string().trim().min(2, "Nama Anda minimal 2 karakter").max(80),
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter").max(72),
  phone: z.string().trim().max(30).optional(),
});

export async function POST(req: NextRequest) {
  // Rate limit pendaftaran: 5 percobaan / 10 menit / IP
  if (!rateLimit(`register:${clientIp(req)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan pendaftaran. Coba lagi dalam 10 menit." },
      { status: 429 }
    );
  }

  try {
    const parsed = registerInput.safeParse(await req.json());
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json({ error: first.message }, { status: 422 });
    }
    const { companyName, name, email, password, phone } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email sudah terdaftar. Silakan masuk atau gunakan email lain." },
        { status: 409 }
      );
    }

    const orgId = `org_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const userId = `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000);
    const passwordHash = hashPassword(password);

    await prisma.$transaction([
      prisma.organization.create({
        data: {
          id: orgId,
          name: companyName,
          plan: "trial",
          trialEndsAt,
        },
      }),
      prisma.user.create({
        data: {
          id: userId,
          organizationId: orgId,
          email,
          name,
          passwordHash,
          role: "admin",
        },
      }),
      prisma.companySettings.create({
        data: {
          id: `cs_${orgId}`,
          organizationId: orgId,
          name: companyName,
          tagline: "Dokumen resmi via Nusadoc",
          email,
          phone: phone ?? "",
          ppnDefault: true,
          defaultNotesQuotation: "Penawaran ini berlaku hingga tanggal kedaluwarsa di atas.",
          defaultNotesInvoice: "Mohon cantumkan nomor invoice pada berita transfer.",
          banks: [],
        },
      }),
    ]);

    const { token, expiresAt } = await createSession(userId);
    await logAudit(email, "organization.register", "Organization", orgId, {
      companyName,
      plan: "trial",
      trialEndsAt: trialEndsAt.toISOString(),
    });

    const response = NextResponse.json(
      {
        ok: true,
        user: { id: userId, email, name, role: "admin" },
        organization: {
          id: orgId,
          name: companyName,
          plan: "trial",
          trialEndsAt: trialEndsAt.toISOString(),
        },
      },
      { status: 201 }
    );

    response.cookies.set("docflow_session", token, sessionCookieOptions(expiresAt));
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mendaftarkan akun";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
