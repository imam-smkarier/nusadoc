// @vitest-environment node
import crypto from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Integration — celah lintas tenant pada billing, reset demo, dan perangkat TTE mobile.
 * Dua workspace uji (A dan B) di MySQL dev; sesi web di-mock, selebihnya route & DB asli.
 * Midtrans tidak pernah dipanggil (createSnapTransaction di-mock).
 */

const { ids, session } = vi.hoisted(() => {
  const t = Date.now();
  return {
    ids: {
      orgA: `org_test_isoA_${t}`,
      orgB: `org_test_isoB_${t}`,
      adminA: `usr_test_isoA_${t}`,
      adminB: `usr_test_isoB_${t}`,
      financeA: `usr_test_isoAf_${t}`,
      emailA: `iso-a-${t}@testing.co.id`,
      emailB: `iso-b-${t}@testing.co.id`,
      emailFinA: `iso-af-${t}@testing.co.id`,
      deviceA: `dev-test-iso-${t}`,
    },
    session: { current: null as null | { id: string; email: string; role: string; organizationId: string; name: string } },
  };
});

vi.mock("@/lib/server/auth", async () => {
  const { NextResponse } = await import("next/server");
  return {
    getSessionUser: async () => session.current,
    forbidden: (message: string) => NextResponse.json({ error: message }, { status: 403 }),
  };
});
vi.mock("@/lib/server/audit", () => ({ logAudit: async () => {} }));
vi.mock("@/lib/server/midtrans", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server/midtrans")>()),
  createSnapTransaction: async () => ({ token: "snap-test", redirectUrl: "/snap-test", simulated: true }),
}));

const { prisma } = await import("@/lib/server/db");
const { hashPassword } = await import("@/lib/server/password");
const { signMobileJwt } = await import("@/lib/server/mobile-auth");
const { clearDatabase } = await import("@/lib/server/seedDb");
const simulatedPay = await import("@/app/api/subscription/simulated-pay/route");
const checkout = await import("@/app/api/subscription/checkout/route");
const webhook = await import("@/app/api/webhooks/midtrans/route");
const reset = await import("@/app/api/reset/route");
const mobileLogin = await import("@/app/api/mobile/auth/login/route");
const deviceRegister = await import("@/app/api/mobile/devices/register/route");
const sign = await import("@/app/api/mobile/approvals/[id]/sign/route");

const PASSWORD = "uji-isolasi-123";
const asAdmin = (org: "A" | "B") =>
  org === "A"
    ? { id: ids.adminA, email: ids.emailA, role: "admin", organizationId: ids.orgA, name: "Admin A" }
    : { id: ids.adminB, email: ids.emailB, role: "admin", organizationId: ids.orgB, name: "Admin B" };

const json = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

let orderSeq = 0;
async function pendingOrder(organizationId: string | null, plan = "hakguna", customerEmail = "pembeli@testing.co.id") {
  orderSeq += 1;
  return prisma.subscription.create({
    data: {
      id: `sub_${ids.orgA}_${orderSeq}`,
      organizationId,
      plan,
      status: "pending",
      amount: BigInt(19_900_000),
      interval: "lifetime",
      orderId: `NSD-SUB-TEST-${ids.orgA}-${orderSeq}`,
      customerName: "Pembeli Uji",
      customerEmail,
    },
  });
}
const planOf = async (id: string) => (await prisma.organization.findUniqueOrThrow({ where: { id } })).plan;

beforeAll(async () => {
  for (const [id, name] of [[ids.orgA, "[TEST] Workspace A"], [ids.orgB, "[TEST] Workspace B"]]) {
    await prisma.organization.create({ data: { id, name, plan: "trial", trialEndsAt: new Date(Date.now() + 86_400_000) } });
  }
  const pw = hashPassword(PASSWORD);
  await prisma.user.createMany({
    data: [
      { id: ids.adminA, organizationId: ids.orgA, email: ids.emailA, name: "Admin A", passwordHash: pw, role: "admin" },
      { id: ids.adminB, organizationId: ids.orgB, email: ids.emailB, name: "Admin B", passwordHash: pw, role: "admin" },
      { id: ids.financeA, organizationId: ids.orgA, email: ids.emailFinA, name: "Finance A", passwordHash: pw, role: "finance" },
    ],
  });
  await prisma.deviceSigner.create({
    data: { id: `dev_${ids.orgA}`, userId: ids.adminA, deviceId: ids.deviceA, deviceName: "HP A", publicKey: "KUNCI-A", isActive: true },
  });
});

afterEach(() => {
  session.current = null;
  vi.unstubAllEnvs();
});

afterAll(async () => {
  const orgs = [ids.orgA, ids.orgB];
  const users = [ids.adminA, ids.adminB, ids.financeA];
  await prisma.subscription.deleteMany({
    where: { OR: [{ organizationId: { in: orgs } }, { orderId: { startsWith: `NSD-SUB-TEST-${ids.orgA}` } }, { customerEmail: { in: [ids.emailA, ids.emailB] } }] },
  });
  await prisma.mobileRefreshToken.deleteMany({ where: { userId: { in: users } } });
  await prisma.deviceSigner.deleteMany({ where: { userId: { in: users } } });
  await prisma.itemTemplate.deleteMany({ where: { organizationId: { in: orgs } } });
  await prisma.client.deleteMany({ where: { organizationId: { in: orgs } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
});

describe("simulated-pay — tidak bisa mengaktifkan paket gratis", () => {
  const call = (orderId: string) =>
    simulatedPay.GET(new NextRequest(`http://localhost/api/subscription/simulated-pay?order_id=${encodeURIComponent(orderId)}`));

  it("tidak ada di production", async () => {
    const order = await pendingOrder(ids.orgA);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    expect((await call(order.orderId)).status).toBe(404);
    expect(await planOf(ids.orgA)).toBe("trial");
  });

  it("tidak ada saat Midtrans terkonfigurasi", async () => {
    const order = await pendingOrder(ids.orgA);
    vi.stubEnv("MIDTRANS_SERVER_KEY", "SB-Mid-server-test");
    session.current = asAdmin("A");
    expect((await call(order.orderId)).status).toBe(404);
    expect(await planOf(ids.orgA)).toBe("trial");
  });

  it("order workspace B tidak bisa dilunasi tanpa sesi atau oleh admin workspace A", async () => {
    const order = await pendingOrder(ids.orgB);
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    expect((await call(order.orderId)).status).toBe(403);
    session.current = asAdmin("A");
    expect((await call(order.orderId)).status).toBe(403);
    expect(await planOf(ids.orgB)).toBe("trial");
  });

  it("admin pemilik (dev, tanpa kunci) bisa mensimulasikan sekali saja", async () => {
    const order = await pendingOrder(ids.orgA, "bulanan");
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    session.current = asAdmin("A");
    expect((await call(order.orderId)).status).toBe(307);
    expect(await planOf(ids.orgA)).toBe("bulanan");
    expect((await call(order.orderId)).status).toBe(409);
    await prisma.organization.update({ where: { id: ids.orgA }, data: { plan: "trial" } });
  });
});

describe("checkout — order selalu milik workspace sesi", () => {
  const body = (customerEmail: string) => ({ plan: "lite", customerName: "Pembeli", customerEmail });
  const call = (customerEmail: string) => checkout.POST(json("http://localhost/api/subscription/checkout", body(customerEmail)));

  it("tamu memakai email admin workspace B → 401, tidak ada order baru", async () => {
    const before = await prisma.subscription.count({ where: { customerEmail: ids.emailB } });
    const res = await call(ids.emailB);
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("LOGIN_REQUIRED");
    expect(await prisma.subscription.count({ where: { customerEmail: ids.emailB } })).toBe(before);
  });

  it("non-admin tidak bisa membeli paket", async () => {
    session.current = { id: ids.financeA, email: ids.emailFinA, role: "finance", organizationId: ids.orgA, name: "Finance A" };
    expect((await call(ids.emailFinA)).status).toBe(403);
  });

  it("admin A mengetik email admin B → order tetap terikat ke workspace A", async () => {
    session.current = asAdmin("A");
    const res = await call(ids.emailB);
    expect(res.status).toBe(200);
    const sub = await prisma.subscription.findUniqueOrThrow({ where: { orderId: (await res.json()).orderId } });
    expect(sub.organizationId).toBe(ids.orgA);
  });
});

describe("webhook Midtrans — tidak menautkan order lewat email", () => {
  it("settlement order tanpa workspace dengan email admin B tidak mengubah paket B", async () => {
    const serverKey = "SB-Mid-server-test-isolasi";
    vi.stubEnv("MIDTRANS_SERVER_KEY", serverKey);
    const order = await pendingOrder(null, "hakguna", ids.emailB);
    const [statusCode, grossAmount] = ["200", "19900000.00"];
    const signature = crypto.createHash("sha512").update(`${order.orderId}${statusCode}${grossAmount}${serverKey}`).digest("hex");

    const res = await webhook.POST(
      json("http://localhost/api/webhooks/midtrans", {
        order_id: order.orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signature,
        transaction_status: "settlement",
      })
    );

    expect(res.status).toBe(200);
    expect(await planOf(ids.orgB)).toBe("trial");
    const after = await prisma.subscription.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.organizationId).toBeNull();
  });

  it("signature 'simulated' ditolak di production meski kunci Midtrans kosong", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MIDTRANS_SERVER_KEY", "");
    const order = await pendingOrder(ids.orgA);
    const res = await webhook.POST(
      json("http://localhost/api/webhooks/midtrans", {
        order_id: order.orderId,
        status_code: "200",
        gross_amount: "19900000.00",
        signature_key: "simulated",
        transaction_status: "settlement",
      })
    );
    expect(res.status).toBe(401);
    expect(await planOf(ids.orgA)).toBe("trial");
  });
});

describe("reset demo — tidak pernah menyentuh tenant lain", () => {
  it("admin workspace non-demo ditolak 403", async () => {
    session.current = asAdmin("A");
    expect((await reset.POST()).status).toBe(403);
  });

  it("clearDatabase(org) hanya menghapus data workspace itu", async () => {
    for (const org of [ids.orgA, ids.orgB]) {
      await prisma.client.create({ data: { id: `cli_${org}`, organizationId: org, code: "CL-001", name: "[TEST] Klien", address: "Jl. Uji", createdAt: new Date() } });
      await prisma.itemTemplate.create({ data: { id: `tpl_${org}`, organizationId: org, name: "[TEST] Template", items: [] } });
    }

    await clearDatabase(prisma, ids.orgA);

    expect(await prisma.client.count({ where: { organizationId: ids.orgA } })).toBe(0);
    expect(await prisma.itemTemplate.count({ where: { organizationId: ids.orgA } })).toBe(0);
    expect(await prisma.client.count({ where: { organizationId: ids.orgB } })).toBe(1);
    expect(await prisma.itemTemplate.count({ where: { organizationId: ids.orgB } })).toBe(1);
  });
});

describe("perangkat TTE mobile — tidak bisa diambil alih lintas tenant", () => {
  const tokenFor = (who: "A" | "B", deviceId: string) => {
    const u = asAdmin(who);
    return signMobileJwt({ sub: u.id, email: u.email, name: u.name, role: u.role, deviceId });
  };

  it("login user B dengan deviceId milik user A → 409, pemilik tetap A", async () => {
    const res = await mobileLogin.POST(
      json("http://localhost/api/mobile/auth/login", { email: ids.emailB, password: PASSWORD, deviceId: ids.deviceA })
    );
    expect(res.status).toBe(409);
    const device = await prisma.deviceSigner.findUniqueOrThrow({ where: { deviceId: ids.deviceA } });
    expect(device.userId).toBe(ids.adminA);
  });

  it("user B tidak bisa memasang kunci/PIN ke perangkat A", async () => {
    const res = await deviceRegister.POST(
      json("http://localhost/api/mobile/devices/register", { publicKey: "KUNCI-B", pin: "654321" }, { authorization: `Bearer ${tokenFor("B", ids.deviceA)}` })
    );
    expect(res.status).toBe(409);
    const device = await prisma.deviceSigner.findUniqueOrThrow({ where: { deviceId: ids.deviceA } });
    expect(device.publicKey).toBe("KUNCI-A");
    expect(device.pinHash).toBeNull();
  });

  it("user B tidak bisa menandatangani memakai perangkat A", async () => {
    const res = await sign.POST(
      json("http://localhost/api/mobile/approvals/quo_x/sign", { pin: "123456" }, { authorization: `Bearer ${tokenFor("B", ids.deviceA)}` }),
      { params: Promise.resolve({ id: "quo_x" }) }
    );
    expect(res.status).toBe(403);
  });
});
