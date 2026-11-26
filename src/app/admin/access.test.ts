import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
 * Nothing protects /admin but the code of each screen (no middleware reaches it),
 * so what is being tested here is that none was forgotten.
 */

const pages = readdirSync("src/app/admin", { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith("page.tsx"))
  .map((file) => `src/app/admin/${file}`)
  .sort();

describe("every screen of the backoffice", () => {
  it("is here", () => {
    expect(pages.length).toBe(18);
  });

  it.each(pages.filter((page) => !page.includes("/login/")))("%s checks the session before anything else", (page) => {
    const source = readFileSync(page, "utf8");
    const opening = /export default async function \w+\([\s\S]*?\) \{\n([\s\S]*)/.exec(source)?.[1] ?? "";
    expect(opening.trimStart()).toMatch(
      /^const session = await auth\(\);\s+if \(!session\?\.user\) redirect\("\/admin\/login"\);/,
    );
    expect(source).toContain('export const dynamic = "force-dynamic"');
  });
});

describe("the theme", () => {
  const layout = readFileSync("src/app/admin/layout.tsx", "utf8");

  it("is applied by the parser, before anything in <body> is painted", () => {
    const body = layout.slice(layout.indexOf("<body"));
    expect(body.indexOf("siteThemeBootScript")).toBeGreaterThan(0);
    expect(body.indexOf("siteThemeBootScript")).toBeLessThan(body.indexOf("{children}"));
    // next/script's `beforeInteractive` queues inline code for after the first paint.
    expect(layout).not.toMatch(/from "next\/script"/);
  });

  it("is the site's alone: the palette and the font of the CLI version have no part in it", () => {
    expect(layout).not.toMatch(/themeBootScript\b(?<!siteThemeBootScript)|ThemeProvider|data-theme|data-font|fontVars\b(?<!siteFontVars)/);
  });
});
