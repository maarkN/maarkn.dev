import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const auth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => auth() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
const set = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set }),
  headers: async () => new Headers({ "accept-language": "en" }),
}));

const { setAdminLocale, setAdminTimeZone } = await import("./preferences");

const form = (timeZone: string) => {
  const data = new FormData();
  data.set("timeZone", timeZone);
  return data;
};

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { email: "admin@local.test" } });
  set.mockReset();
  revalidatePath.mockReset();
});

describe("setAdminLocale", () => {
  it("keeps the choice for the backoffice alone, and brings every screen back in it", async () => {
    expect(await setAdminLocale("en")).toEqual({ ok: true });
    expect(set).toHaveBeenCalledWith("admin-locale", "en", expect.objectContaining({ path: "/admin", sameSite: "lax" }));
    expect(set.mock.calls[0][2].maxAge).toBeGreaterThan(60 * 60 * 24 * 300);
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
  });

  it("refuses a language it does not have", async () => {
    for (const locale of ["de", "", "pt", "__proto__"]) expect(await setAdminLocale(locale)).toMatchObject({ ok: false });
    expect(set).not.toHaveBeenCalled();
  });

  it("without a session goes to the login, and keeps nothing", async () => {
    auth.mockResolvedValue(null);
    await expect(setAdminLocale("en")).rejects.toThrow("NEXT_REDIRECT /admin/login");
    await expect(setAdminTimeZone(form("UTC"))).rejects.toThrow("NEXT_REDIRECT /admin/login");
    expect(set).not.toHaveBeenCalled();
  });
});

describe("setAdminTimeZone", () => {
  it("keeps the zone as the runtime writes it", async () => {
    expect(await setAdminTimeZone(form(" europe/dublin "))).toMatchObject({ ok: true, message: "Time zone saved." });
    expect(set).toHaveBeenCalledWith("admin-time-zone", "Europe/Dublin", expect.objectContaining({ path: "/admin" }));
  });

  it("refuses one it does not know, at the field, and keeps the one there was", async () => {
    for (const zone of ["Mars/Olympus", "", "+03:00", "UTC; path=/"]) {
      const result = await setAdminTimeZone(form(zone));
      expect(result).toMatchObject({ ok: false, fieldErrors: { timeZone: expect.any(String) } });
    }
    expect(set).not.toHaveBeenCalled();
  });
});
