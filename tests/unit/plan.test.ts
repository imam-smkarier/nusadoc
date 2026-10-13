import { describe, expect, it } from "vitest";
import { formatPlanPrice, PLAN_CATALOG, PlanId } from "@/lib/plans";

describe("PLAN_CATALOG — katalog paket SaaS Nusadoc", () => {
  it("Lite: Rp 50.000 / bln, batas 25 dokumen, 1 user", () => {
    const p = PLAN_CATALOG.lite;
    expect(p.priceIdr).toBe(50_000);
    expect(p.docsLimit).toBe(25);
    expect(p.usersLimit).toBe(1);
    expect(p.durationDays).toBe(30);
    expect(p.selfServe).toBe(true);
  });

  it("Trial: Rp 0, 30 hari, tanpa batas dokumen", () => {
    const p = PLAN_CATALOG.trial;
    expect(p.priceIdr).toBe(0);
    expect(p.docsLimit).toBeNull();
    expect(p.durationDays).toBe(30);
    expect(p.selfServe).toBe(false);
  });

  it("Bulanan: Rp 249.000 / bln, tanpa batas dokumen, 3 user", () => {
    const p = PLAN_CATALOG.bulanan;
    expect(p.priceIdr).toBe(249_000);
    expect(p.docsLimit).toBeNull();
    expect(p.usersLimit).toBe(3);
    expect(p.durationDays).toBe(30);
  });

  it("Hak Guna: Rp 19.900.000 sekali bayar selamanya (lifetime)", () => {
    const p = PLAN_CATALOG.hakguna;
    expect(p.priceIdr).toBe(19_900_000);
    expect(p.docsLimit).toBeNull();
    expect(p.durationDays).toBeNull();
  });

  it("Enterprise: custom / hubungi kami", () => {
    const p = PLAN_CATALOG.enterprise;
    expect(p.priceIdr).toBeNull();
    expect(p.selfServe).toBe(false);
  });
});

describe("formatPlanPrice — format tampilan harga kartu", () => {
  it("format Rp 50 rb / bulan untuk lite", () => {
    const f = formatPlanPrice(50_000);
    expect(f.price).toBe("Rp 50");
    expect(f.unit).toBe("rb / bulan");
  });

  it("format Rp 249 rb / bulan untuk bulanan", () => {
    const f = formatPlanPrice(249_000);
    expect(f.price).toBe("Rp 249");
    expect(f.unit).toBe("rb / bulan");
  });

  it("format Rp 19,9 jt sekali bayar untuk hakguna", () => {
    const f = formatPlanPrice(19_900_000);
    expect(f.price).toBe("Rp 19,9");
    expect(f.unit).toBe("jt sekali bayar");
  });

  it("format Hubungi kami untuk null", () => {
    const f = formatPlanPrice(null);
    expect(f.price).toBe("Hubungi");
    expect(f.unit).toBe("kami");
  });

  it("format Gratis 30 hari untuk 0", () => {
    const f = formatPlanPrice(0);
    expect(f.price).toBe("Gratis");
    expect(f.unit).toBe("30 hari");
  });
});
