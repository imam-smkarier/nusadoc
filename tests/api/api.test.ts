import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

/**
 * Integration test API — butuh server berjalan (dev: `npm run dev`, atau PORT sesuai env).
 * Set NUSADOC_TEST_BASE_URL untuk mengaktifkan (default: http://localhost:3000).
 * Dilewati otomatis bila server tidak merespons — CI murni tetap bisa jalan.
 */

const BASE = process.env.NUSADOC_TEST_BASE_URL || "http://localhost:3000";
const ADMIN = { email: "admin@smkarier.co.id", password: "docflow-admin" };

let adminCookie = "";

interface HttpResult {
  status: number;
  body: unknown;
}

async function http(
  method: string,
  path: string,
  body?: unknown,
  cookie?: string
): Promise<HttpResult> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed };
}

// Cache session per akun — menghindari rate limiter login (10 percobaan / 5 menit)
const sessionCache = new Map<string, string>();

async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  return setCookie.map((c) => c.split(";")[0]).join("; ");
}

async function loginOnce(email: string, password: string): Promise<string> {
  const cached = sessionCache.get(email);
  if (cached) return cached;
  const cookie = await login(email, password);
  sessionCache.set(email, cookie);
  return cookie;
}

// Health check SINKRON di module scope — describe.skipIf butuh nilai saat koleksi,
// dan top-level await tidak dijalankan pada modul CJS vitest.
const serverUp = (() => {
  try {
    execSync(`curl -sf --max-time 3 ${BASE}/api/health`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

beforeAll(async () => {
  if (serverUp && !adminCookie) {
    adminCookie = await loginOnce(ADMIN.email, ADMIN.password);
  }
});

afterAll(async () => {
  // Data dokumen test dihapus via reset demo — cukup bila perlu; reset dihindari
  // agar tidak mengganggu data pengguna. Dokumen [TEST] dibiarkan (tersaring di UI).
});

describe.skipIf(!serverUp)("API — auth & RBAC", () => {
  it("login kredensial salah → 401", async () => {
    const res = await http("POST", "/api/auth/login", { email: ADMIN.email, password: "salah" });
    expect(res.status).toBe(401);
  });

  it("tanpa session → write endpoint 401", async () => {
    const res = await http("POST", "/api/quotations", { clientId: "x" });
    expect(res.status).toBe(401);
  });

  it("sales boleh terbit penawaran, tidak boleh payment", async () => {
    const salesCookie = await loginOnce("sales@smkarier.co.id", "docflow-admin");
    // sales terbitkan quotation sederhana
    const client = (await http("POST", "/api/clients", {
      name: "[TEST] Klien RBAC",
      address: "Jl. RBAC",
    }, salesCookie)) as { status: number; body: { id?: string } };
    if (client.status === 201 && client.body.id) {
      const payload = {
        clientId: client.body.id,
        subject: "[TEST] RBAC quotation",
        date: "2026-09-15",
        validUntil: "2026-10-15",
        items: [{ id: "i1", name: "Jasa", qty: 1, unit: "paket", unitPrice: 1_000_000 }],
        tax: { ppnEnabled: false, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
      };
      const quo = await http("POST", "/api/quotations", payload, salesCookie);
      expect(quo.status).toBe(201);
    }

    // payment selalu ditolak untuk sales
    const pay = await http("POST", "/api/payments", { invoiceId: "x", amount: 1, method: "Tunai", date: "2026-09-15" }, salesCookie);
    expect([401, 403]).toContain(pay.status);
  });
});

describe.skipIf(!serverUp)("API — integritas finansial (overpayment & termin)", () => {
  let clientId = "";
  let quotationId = "";
  let invoiceId = "";

  it("siapkan klien + quotation approved + invoice DP50%", async () => {
    const client = await http("POST", "/api/clients", { name: "[TEST] Klien Financial", address: "Jl. Test" }, adminCookie);
    expect(client.status).toBe(201);
    clientId = (client.body as { id: string }).id;

    const quo = await http("POST", "/api/quotations", {
      clientId,
      subject: "[TEST] Financial quotation",
      date: "2026-09-15",
      validUntil: "2026-10-15",
      items: [{ id: "i1", name: "Jasa integrasi", qty: 1, unit: "paket", unitPrice: 10_000_000 }],
      tax: { ppnEnabled: false, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    }, adminCookie);
    expect(quo.status).toBe(201);
    quotationId = (quo.body as { id: string }).id;

    const approve = await http("PATCH", `/api/quotations/${quotationId}`, { status: "sent" }, adminCookie);
    expect(approve.status).toBe(200);
    const approve2 = await http("PATCH", `/api/quotations/${quotationId}`, { status: "approved" }, adminCookie);
    expect(approve2.status).toBe(200);

    const inv = await http("POST", "/api/invoices", {
      quotationId,
      clientId,
      subject: "[TEST] Financial invoice DP",
      date: "2026-09-15",
      dueDate: "2026-09-30",
      terminLabel: "DP 50%",
      terminPct: 50,
      tax: { ppnEnabled: false, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    }, adminCookie);
    expect(inv.status).toBe(201);
    invoiceId = (inv.body as { id: string }).id;
  });

  it("payment melebihi outstanding → 422", async () => {
    const res = await http("POST", "/api/payments", {
      invoiceId,
      amount: 9_000_000, // outstanding hanya 5.000.000 (50% dari 10jt, tanpa pajak)
      method: "Transfer Bank",
      date: "2026-09-20",
    }, adminCookie);
    expect(res.status).toBe(422);
  });

  it("termin kumulatif >100% → 422", async () => {
    const res = await http("POST", "/api/invoices", {
      quotationId,
      clientId,
      subject: "[TEST] Financial invoice melebihi",
      date: "2026-09-15",
      dueDate: "2026-09-30",
      terminLabel: "Progres 60%",
      terminPct: 60, // 50% sudah terpakai → 110% ditolak
      tax: { ppnEnabled: false, ppnRate: 11, pph23Enabled: false, pph23Rate: 2 },
    }, adminCookie);
    expect(res.status).toBe(422);
  });

  it("payment valid → 201, kwitansi otomatis; payment pelunasan → status paid", async () => {
    const pay1 = await http("POST", "/api/payments", {
      invoiceId, amount: 3_000_000, method: "Transfer Bank", date: "2026-09-20",
    }, adminCookie);
    expect(pay1.status).toBe(201);
    const pay1Body = pay1.body as { receipt?: { number?: string } };
    expect(pay1Body.receipt?.number).toMatch(/^NSD\/KWT\//);

    const pay2 = await http("POST", "/api/payments", {
      invoiceId, amount: 2_000_000, method: "Transfer Bank", date: "2026-09-21",
    }, adminCookie);
    expect(pay2.status).toBe(201);

    // Overpayment setelah lunas juga ditolak
    const pay3 = await http("POST", "/api/payments", {
      invoiceId, amount: 100, method: "Tunai", date: "2026-09-22",
    }, adminCookie);
    expect(pay3.status).toBe(422);
  });
});
