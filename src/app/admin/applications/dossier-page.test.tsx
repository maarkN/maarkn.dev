import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeDb, type FakeDb } from "@/lib/mcp/test/fake-db";

/**
 * The current dossier, from the database to the page: `getApplicationDossier`
 * with its real select and order, on the in-memory database, and the page
 * rendered from what it loads. What each section shows on its own is in
 * `dossier-context.test.tsx` and `dossier-tabs.test.tsx`; here it is that the
 * page asks for the fields and puts them on the screen.
 */

const held = vi.hoisted(() => ({ db: {} as Record<string, unknown> }));

vi.mock("server-only", () => ({}));
// The language and the time zone of the backoffice come from the request; a
// request without cookies gets the defaults.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}));
// The shell is an async Server Component with tests of its own; here only the
// screen inside it matters, and `renderToStaticMarkup` renders nothing async.
vi.mock("@/components/admin/admin-shell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
  notFound: () => {
    throw new Error("notFound");
  },
  usePathname: () => "/admin/applications/app_1",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { email: "admin@example.com" } }) }));
vi.mock("@/app/_actions/auth", () => ({ logoutAction: vi.fn(), loginAction: vi.fn() }));
vi.mock("@/lib/db", () => ({
  dbConfigured: true,
  db: new Proxy({}, { get: (_target, model) => held.db[model as string] }),
}));

const { getApplicationDossier } = await import("./[id]/dossier");
const { default: ApplicationDetailPage } = await import("./[id]/page");

let db: FakeDb;

beforeEach(() => {
  db = createFakeDb();
  held.db = db as unknown as Record<string, unknown>;
});

async function given(application: Record<string, unknown>): Promise<string> {
  const company = await db.company.create({
    data: { folderName: "acme", name: "Acme", aboutMd: "Builds rockets." },
  });
  const job = await db.job.create({
    data: { sourceUrl: "https://jobs.example/1", title: "Engineer", descriptionMd: "We look for someone." },
  });
  const row = await db.application.create({
    data: {
      folderName: "acme--engineer",
      companyId: company.id,
      jobId: job.id,
      projectInfoMd: "The propulsion team.",
      visibility: "private",
      updatedAt: new Date("2026-11-20T12:00:00Z"),
      ...application,
    },
  });
  return row.id;
}

async function interview(applicationId: string, data: Record<string, unknown>) {
  await db.interview.create({ data: { applicationId, kind: "technical", ...data } });
}

describe("getApplicationDossier", () => {
  it("orders the interviews by their place in the process, not by round or date", async () => {
    const id = await given({});
    const at = (day: number) => new Date(`2026-12-${String(day).padStart(2, "0")}T15:00:00Z`);
    // Round and date both disagree with the order of the process; the two
    // with the same place are put in order by the date.
    await interview(id, { sourceKey: "third", orderIndex: 2, round: 1, status: "scheduled", scheduledAt: at(1) });
    await interview(id, { sourceKey: "first", orderIndex: 0, round: 3, status: "scheduled", scheduledAt: at(20) });
    await interview(id, { sourceKey: "second-late", orderIndex: 1, round: 2, status: "scheduled", scheduledAt: at(15) });
    await interview(id, { sourceKey: "second-early", orderIndex: 1, round: 4, status: "scheduled", scheduledAt: at(10) });

    const result = await getApplicationDossier(id);
    expect(result.status).toBe("ok");
    const ids = Object.fromEntries(db.rows.interview().map((row) => [row.id, row.sourceKey]));
    expect(result.status === "ok" && result.application.interviews.map((row) => ids[row.id])).toEqual([
      "first",
      "second-early",
      "second-late",
      "third",
    ]);
  });
});

describe("the dossier page", () => {
  async function render(application: Record<string, unknown>): Promise<string> {
    const id = await given(application);
    const page = await ApplicationDetailPage({ params: Promise.resolve({ id }) } as never);
    return renderToStaticMarkup(page);
  }

  /** The text of the page, without the markup. */
  const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  it("shows the closure reason next to the free text", async () => {
    const page = text(
      await render({ stage: "rejected", closureReason: "location", outcomeReason: "Went with a local candidate" }),
    );
    expect(page).toMatch(/Motivo de encerramento Local /);
    expect(page).toContain("Went with a local candidate");
  });

  it("shows the company, the project and the job, each in its section", async () => {
    const page = text(await render({}));
    expect(page).toMatch(/Sobre a empresa Builds rockets\./);
    expect(page).toMatch(/Contexto do projeto The propulsion team\./);
    expect(page).toMatch(/Descrição da vaga We look for someone\./);
  });

  it("with nothing written, the three sections are there and say so", async () => {
    const page = text(await render({ projectInfoMd: null, companyId: null, jobId: null }));
    expect(page).toContain("Não há empresa ligada a esta candidatura.");
    expect(page).toContain("Ainda não há informação sobre o projeto.");
    expect(page).toContain("Não há vaga ligada a esta candidatura.");
  });
});
