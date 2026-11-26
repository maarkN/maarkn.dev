/**
 * What the server sends, with the cookies of the request: the document, the shell
 * as it was left and the mark of the language. What the browser makes of it is in
 * scripts/e2e-admin.mjs, which does not run in CI.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "@/components/admin/admin-shell";
import { useAdminFormat } from "@/components/admin/admin-locale";
import { TooltipProvider } from "@/components/ui/tooltip";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import AdminRootLayout, { generateMetadata } from "./layout";

// A parser, and not the environment: `server-only` does not exist in that of a browser.
type Parser = { JSDOM: new (html: string) => { window: { document: Document } } };
const { JSDOM } = await vi.importActual<Parser>("jsdom");

let jar: Record<string, string>;
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name in jar ? { name, value: jar[name] } : undefined) }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/jobs", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/app/_actions/auth", () => ({ logoutAction: vi.fn() }));
vi.mock("@/app/_actions/search", () => ({ listSearchableApplications: vi.fn() }));
// Only the compiler of Next knows what to do with these.
vi.mock("../fonts", () => ({ caskaydia: { variable: "face" } }));
vi.mock("../site-fonts", () => ({ siteFontVars: "faces" }));

function Instant() {
  return <time>{useAdminFormat().formatDateTime("2026-08-04T01:30:00Z")}</time>;
}

/** The document the server sends, as elements. */
async function document(children: React.ReactNode = <Instant />) {
  return new JSDOM(renderToStaticMarkup(await AdminRootLayout({ children }))).window.document;
}

beforeEach(() => {
  jar = {};
});

describe("the document of the backoffice", () => {
  it("is in the language of the request, title included", async () => {
    for (const [locale, texts] of [["pt-BR", ptBR], ["en", en]] as const) {
      jar = { "admin-locale": locale };
      expect((await document()).documentElement.lang).toBe(locale);
      expect((await generateMetadata()).title).toBe(texts.admin.meta.title);
    }
  });

  it("hands the language and the time zone to the browser", async () => {
    jar = { "admin-locale": "en", "admin-time-zone": "Asia/Tokyo" };
    expect((await document()).querySelector("time")?.textContent).toBe("Aug 4, 2026, 10:30");
    jar = { "admin-locale": "pt-BR" };
    expect((await document()).querySelector("time")?.textContent).toBe("03/08/2026, 22:30");
  });

  it("has the theme before anything is painted, and is not indexed", async () => {
    const { body } = await document();
    expect(body.className.split(" ")).toEqual(expect.arrayContaining(["site-root", "admin-root"]));
    expect(body.firstElementChild?.id).toBe("theme-boot");
    expect((await generateMetadata()).robots).toEqual({ index: false, follow: false });
  });

  it("has one place for notices, named in the language of the interface", async () => {
    // Each notice says the language of its own words (`useNotify`): the place is
    // the document's, in the language of the request.
    for (const [locale, texts] of [["pt-BR", ptBR], ["en", en]] as const) {
      jar = { "admin-locale": locale };
      const sent = await document();
      const notices = sent.querySelectorAll(`section[aria-label^="${texts.admin.shell.notices}"]`);
      expect(notices).toHaveLength(1);
      expect(notices[0].closest("[lang]")?.getAttribute("lang")).toBe(locale);
      expect(sent.querySelectorAll("section[aria-live]")).toHaveLength(1);
    }
  });
});

describe("the shell of a screen", () => {
  const screen = async (translated = false) =>
    document(
      <TooltipProvider>
        {await AdminShell({ email: "marco@example.com", translated, children: <p id="screen">Vagas</p> })}
      </TooltipProvider>,
    );

  it("is in the language of the request, and says the screen is still in Portuguese", async () => {
    jar = { "admin-locale": "en" };
    const sent = await screen();
    expect(sent.querySelector("aside nav")?.getAttribute("aria-label")).toBe(en.admin.shell.menu);
    expect(sent.querySelector("#screen")?.closest("[lang]")?.getAttribute("lang")).toBe("pt-BR");
    expect(sent.querySelector("aside")?.closest("[lang]")?.getAttribute("lang")).toBe("en");
  });

  it("speaks the language of the interface once the screen is translated", async () => {
    for (const locale of ["en", "pt-BR"] as const) {
      jar = { "admin-locale": locale };
      expect((await screen(true)).querySelector("#screen")?.closest("[lang]")?.getAttribute("lang")).toBe(locale);
    }
  });

  it("comes with the menu as it was left", async () => {
    expect((await screen()).querySelector("[data-menu]")).toBeNull();
    jar = { "admin-menu": "open" };
    expect((await screen()).querySelector("[data-menu]")).toBeNull();
    jar = { "admin-menu": "collapsed" };
    expect((await screen()).querySelector("[data-menu=collapsed]")).not.toBeNull();
  });
});
