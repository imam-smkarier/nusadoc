import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { ApiError, AppStoreProvider, NetworkError, api, guarded, useApp } from "@/lib/store";
import { buildSeedData } from "@/lib/seed";

/**
 * Regresi: store dulu menangkap SEMUA error (termasuk 402/403/422 dari server) lalu
 * membuat dokumen palsu di browser. Sekarang penolakan server diteruskan apa adanya,
 * dan aksi finansial gagal tertutup saat server tak terjangkau.
 */

type FakeRes = { ok: boolean; status: number; json: () => Promise<unknown> };
const res = (status: number, body: unknown): FakeRes => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const QUOTA_402 = {
  error: "Kuota dokumen paket Lite terlampaui (25/25 bulan ini).",
  code: "DOCUMENT_QUOTA_EXCEEDED",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("api() — klasifikasi error", () => {
  it("402 dari server → ApiError dengan status, pesan, dan code server", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(402, QUOTA_402)));
    const err = (await api("/api/quotations", { method: "POST" }).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(402);
    expect(err.code).toBe("DOCUMENT_QUOTA_EXCEEDED");
    expect(err.message).toContain("Kuota dokumen");
  });

  it("fetch gagal (jaringan putus) → NetworkError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(api("/api/bootstrap")).rejects.toBeInstanceOf(NetworkError);
  });

  it("503 (database tak terjangkau) → NetworkError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(503, { error: "Database tidak terjangkau" })));
    await expect(api("/api/bootstrap")).rejects.toBeInstanceOf(NetworkError);
  });
});

describe("guarded() — fail-closed", () => {
  it.each([402, 403, 422])("penolakan server %i diteruskan; fallback lokal TIDAK dijalankan", async (status) => {
    const fallback = vi.fn();
    const onOffline = vi.fn();
    const call = () => Promise.reject(new ApiError("ditolak", status));
    await expect(guarded(true, call, fallback, onOffline)).rejects.toMatchObject({ status });
    await expect(guarded(false, call, fallback, onOffline)).rejects.toMatchObject({ status });
    expect(fallback).not.toHaveBeenCalled();
    expect(onOffline).not.toHaveBeenCalled();
  });

  it("server tak terjangkau + aksi finansial → gagal, tanpa dokumen lokal", async () => {
    const fallback = vi.fn();
    const onOffline = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      guarded(true, () => Promise.reject(new NetworkError("putus")), fallback, onOffline)
    ).rejects.toThrow(/tidak diterbitkan/);
    expect(fallback).not.toHaveBeenCalled();
    expect(onOffline).toHaveBeenCalledOnce();
  });

  it("server tak terjangkau + aksi non-finansial → fallback lokal tetap boleh", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const out = await guarded(false, () => Promise.reject(new NetworkError("putus")), () => "lokal", () => {});
    expect(out).toBe("lokal");
  });
});

describe("AppStoreProvider — kuota 402 tidak bisa diakali tampilan", () => {
  function mount() {
    const seed = buildSeedData();
    const ref: { current: ReturnType<typeof useApp> | null } = { current: null };
    function Probe() {
      ref.current = useApp();
      return null;
    }
    render(
      <AppStoreProvider>
        <Probe />
      </AppStoreProvider>
    );
    const input = {
      clientId: seed.clients[0].id,
      subject: "Pengadaan perangkat",
      date: "2026-10-13",
      validUntil: "2026-11-12",
      items: seed.quotations[0].items,
      tax: seed.quotations[0].tax,
    };
    return { seed, ref, input };
  }

  it("issueQuotation ditolak 402 → error sampai ke UI, tidak ada penawaran palsu, bukan mode lokal", async () => {
    const seed = buildSeedData();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path: string) => (path === "/api/bootstrap" ? res(200, seed) : res(402, QUOTA_402)))
    );
    const { ref, input } = mount();
    await waitFor(() => expect(ref.current?.ready).toBe(true));
    const before = ref.current!.data.quotations.length;

    await expect(ref.current!.issueQuotation(input)).rejects.toMatchObject({ status: 402, code: "DOCUMENT_QUOTA_EXCEEDED" });

    expect(ref.current!.data.quotations.length).toBe(before);
    expect(ref.current!.localMode).toBe(false);
  });

  it("issueQuotation saat server putus → gagal tertutup, tidak ada penawaran lokal", async () => {
    const seed = buildSeedData();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path: string) => {
        if (path === "/api/bootstrap") return res(200, seed);
        throw new TypeError("Failed to fetch");
      })
    );
    const { ref, input } = mount();
    await waitFor(() => expect(ref.current?.ready).toBe(true));
    const before = ref.current!.data.quotations.length;

    await expect(ref.current!.issueQuotation(input)).rejects.toThrow(/tidak diterbitkan/);

    await waitFor(() => expect(ref.current!.localMode).toBe(true));
    expect(ref.current!.data.quotations.length).toBe(before);
  });
});
