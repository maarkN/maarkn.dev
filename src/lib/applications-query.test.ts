/**
 * The list of applications is read by the server (spec admin-listing, "Filtros
 * e paginação na URL"): what the URL says is filtered, ordered and cut into a
 * page in the database, and a page past the end is the last one.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const count = vi.fn();
const findMany = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  dbConfigured: true,
  db: { application: { count: (...a: unknown[]) => count(...a), findMany: (...a: unknown[]) => findMany(...a) } },
}));

const { listApplications, parseApplicationFilters, parsePage, EMPTY_APPLICATION_FILTERS } = await import("./applications-query");

beforeEach(() => {
  count.mockReset();
  findMany.mockReset().mockResolvedValue([]);
});

describe("listApplications", () => {
  it("shows the last page when the address asks for one past the end", async () => {
    count.mockResolvedValue(45); // 3 pages of 20
    const result = await listApplications({ filters: EMPTY_APPLICATION_FILTERS, page: 9 });
    expect(result.page).toBe(3);
    expect(result.totalPages).toBe(3);
    expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 40, take: 20 });
  });

  it("applies the filters of the URL in the database", async () => {
    count.mockResolvedValue(1);
    const filters = parseApplicationFilters({ q: "acme", stage: "interview", route: "relocation" });
    await listApplications({ filters, page: 1 });
    const { where } = findMany.mock.calls[0][0];
    expect(JSON.stringify(where)).toContain('"stage":"interview"');
    expect(JSON.stringify(where)).toContain('"contains":"acme"');
    expect(count.mock.calls[0][0]).toEqual({ where });
  });

  it("orders by the column asked for, and by the funnel by default", async () => {
    count.mockResolvedValue(1);
    await listApplications({ filters: EMPTY_APPLICATION_FILTERS, page: 1 });
    expect(findMany.mock.calls[0][0].orderBy[0]).toEqual({ stage: "asc" });

    await listApplications({ filters: EMPTY_APPLICATION_FILTERS, page: 1, sort: { key: "updated", dir: "desc" } });
    expect(findMany.mock.calls[1][0].orderBy[0]).toEqual({ updatedAt: "desc" });

    await listApplications({ filters: EMPTY_APPLICATION_FILTERS, page: 1, sort: { key: "company", dir: "asc" } });
    expect(findMany.mock.calls[2][0].orderBy[0]).toEqual({ company: { name: "asc" } });

    await listApplications({ filters: EMPTY_APPLICATION_FILTERS, page: 1, sort: { key: "sent", dir: "desc" } });
    expect(findMany.mock.calls[3][0].orderBy[0]).toEqual({ appliedAt: { sort: "desc", nulls: "last" } });
  });

  it("says it failed, instead of an empty list, when the database does not answer", async () => {
    count.mockRejectedValue(new Error("connection refused"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await listApplications({ filters: EMPTY_APPLICATION_FILTERS, page: 1 });
    expect(result.failed).toBe(true);
    error.mockRestore();
  });
});

describe("the URL", () => {
  it("drops a value it does not know, before the database sees it", () => {
    expect(parseApplicationFilters({ stage: "' OR 1=1", route: "moon" })).toMatchObject({ stage: "", route: "" });
    expect(parsePage("-3")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("4")).toBe(4);
  });
});
