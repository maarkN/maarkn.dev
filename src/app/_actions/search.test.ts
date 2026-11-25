import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const auth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => auth() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers({ "accept-language": "pt-BR" }),
}));
const findMany = vi.fn();
const database = { configured: true };
vi.mock("@/lib/db", () => ({
  db: { application: { findMany: (args: unknown) => findMany(args) } },
  get dbConfigured() {
    return database.configured;
  },
}));

const { listSearchableApplications } = await import("./search");

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ user: { email: "admin@local.test" } });
  findMany.mockReset().mockResolvedValue([]);
  database.configured = true;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("listSearchableApplications", () => {
  it("without a session goes to the login, and reads nothing", async () => {
    for (const session of [null, {}, { user: null }]) {
      auth.mockResolvedValue(session);
      await expect(listSearchableApplications()).rejects.toThrow("NEXT_REDIRECT /admin/login");
    }
    expect(findMany).not.toHaveBeenCalled();
  });

  it("sends the company and the role, and nothing else of an application", async () => {
    findMany.mockResolvedValue([
      { id: "a1", folderName: "ipe--eng", roleTitle: "Engineer", company: { name: "Ipê Data" }, job: null },
      { id: "a2", folderName: "orbita--lead", roleTitle: null, company: null, job: { title: "Tech Lead" } },
      { id: "a3", folderName: "solo", roleTitle: "", company: null, job: null },
    ]);
    expect(await listSearchableApplications()).toEqual({
      ok: true,
      data: [
        { id: "a1", company: "Ipê Data", role: "Engineer" },
        { id: "a2", company: "orbita--lead", role: "Tech Lead" },
        { id: "a3", company: "solo", role: null },
      ],
    });
    const [{ select }] = findMany.mock.calls[0];
    expect(Object.keys(select).sort()).toEqual(["company", "folderName", "id", "job", "roleTitle"]);
  });

  it("says it failed without saying why, when the database does not answer", async () => {
    findMany.mockRejectedValue(new Error("password authentication failed for user maarkn"));
    const failed = await listSearchableApplications();
    expect(failed).toEqual({ ok: false, message: expect.stringMatching(/não carregaram/) });

    database.configured = false;
    findMany.mockClear();
    expect(await listSearchableApplications()).toEqual(failed);
    expect(findMany).not.toHaveBeenCalled();
  });
});
