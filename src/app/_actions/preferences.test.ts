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

const { setAdminTimeZone } = await import("./preferences");

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

describe("setAdminTimeZone", () => {
  it("keeps the zone as the runtime writes it", async () => {
    expect(await setAdminTimeZone(form(" europe/dublin "))).toMatchObject({ ok: true, message: "Time zone saved." });
    expect(set).toHaveBeenCalledWith(
      "admin-time-zone",
      "Europe/Dublin",
      expect.objectContaining({ path: "/admin", sameSite: "lax", httpOnly: true }),
    );
    expect(set.mock.calls[0][2].maxAge).toBeGreaterThan(60 * 60 * 24 * 300);
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
  });

  it("without a session goes to the login, and keeps nothing", async () => {
    auth.mockResolvedValue(null);
    await expect(setAdminTimeZone(form("UTC"))).rejects.toThrow("NEXT_REDIRECT /admin/login");
    expect(set).not.toHaveBeenCalled();
  });

  it("refuses one it does not know, at the field, and keeps the one there was", async () => {
    for (const zone of ["Mars/Olympus", "", "+03:00", "UTC; path=/"]) {
      const result = await setAdminTimeZone(form(zone));
      expect(result).toMatchObject({ ok: false, fieldErrors: { timeZone: expect.any(String) } });
    }
    expect(set).not.toHaveBeenCalled();
  });
});
