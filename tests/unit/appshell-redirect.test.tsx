import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";

/**
 * Regresi: AppShell memanggil router.replace("/login") di fase render sehingga React
 * melempar "Cannot update a component (Router) while rendering a different component".
 * renderToString tidak menjalankan effect — jadi bila replace terpanggil di sana,
 * berarti navigasi masih dipicu saat render.
 */

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/dashboard",
}));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ authed: false, checked: true, name: "", organization: null, logout: vi.fn() }),
}));
vi.mock("@/lib/store", () => ({
  useApp: () => ({ ready: true, localMode: false }),
}));

const { AppShell } = await import("@/components/app/AppShell");

afterEach(() => replace.mockClear());

describe("AppShell — redirect tanpa sesi", () => {
  it("tidak bernavigasi selama render", () => {
    renderToString(<AppShell>isi</AppShell>);
    expect(replace).not.toHaveBeenCalled();
  });

  it("bernavigasi ke /login lewat effect setelah mount", async () => {
    render(<AppShell>isi</AppShell>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(replace).toHaveBeenCalledOnce();
  });
});
