import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_THEMES, type SiteTheme } from "../site-theme";
import { readPalettes } from "../site-tokens";
import { fails } from "../theme-audit";
import { auditAdmin, readAdminTokens, TINTS } from "./contrast-audit";

const palettes = readPalettes();
const admin = readAdminTokens();

const measured = (theme: SiteTheme, change: Record<string, string> = {}) =>
  auditAdmin(theme, palettes[theme], { ...admin, ...change });
const failing = (theme: SiteTheme, change: Record<string, string> = {}) =>
  measured(theme, change)
    .filter(fails)
    .map(({ pair }) => pair.replace("backoffice: ", ""));

describe("the backoffice in the three themes", () => {
  it("keeps every pair in range", () => {
    for (const theme of SITE_THEMES) expect(failing(theme)).toEqual([]);
  });

  it("measures the primary button and the edge of a field at rest", () => {
    for (const theme of SITE_THEMES) {
      const value = (pair: string) => measured(theme).find((measure) => measure.pair === `backoffice: ${pair}`)!;
      expect(value("primary-foreground on primary").value).toBeGreaterThanOrEqual(4.5);
      // Under the pointer it is translucent.
      expect(value("primary-foreground on primary/80 over accent").value).toBeGreaterThanOrEqual(4.5);
      for (const surface of ["background", "card", "popover"]) {
        expect(value(`input edge on ${surface}`)).toMatchObject({ min: 3 });
        expect(value(`input edge on ${surface}`).value).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("is refused when a pair loses its contrast", () => {
    expect(failing("dracula", { "--primary-foreground": "#ffffff" })).toContain("primary-foreground on primary");
    expect(failing("light", { "--input": "#b9c0d0" })).toContain("input edge on background");
    // Why `--accent` is not the surface of what is in focus.
    expect(failing("dracula", { "--accent": "var(--bg-3)" })).toContain("brand on accent");
    expect(failing("dusk", { "--muted-foreground": "#6b7c8d" })).toContain("muted-foreground on card");
  });

  it("is refused when a token names what the theme does not have", () => {
    expect(() => measured("dusk", { "--card": "var(--nope)" })).toThrow("--nope");
    expect(() => readAdminTokens(".other { --card: red; }")).toThrow();
  });
});

describe("admin.css", () => {
  it("writes the destructive button in `--bg`, as the requirement of the forms says (admin-theme)", () => {
    expect([admin["--destructive"], admin["--destructive-foreground"]]).toEqual(["var(--bad)", "var(--bg)"]);
  });

  it("takes every colour from a token of the site", () => {
    const own = new Set(Object.keys(admin));
    for (const [name, value] of Object.entries(admin)) {
      if (!name.startsWith("--") || name === "--radius") continue;
      for (const [, token] of value.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
        expect(own.has(token) || token === "--type-label" || token in palettes.dusk, `${name}: ${value}`).toBe(true);
      }
      expect(value, name).toMatch(/var\(--/);
    }
  });

  it("gives a value to every name of the shadcn vocabulary", () => {
    const globals = readFileSync("src/app/globals.css", "utf8");
    const block = globals.slice(globals.indexOf("shadcn vocabulary"));
    const names = [...block.slice(0, block.indexOf("\n}")).matchAll(/--color-([a-z-]+)\s*:/g)].map((match) => match[1]);
    expect(names.length).toBeGreaterThan(15);
    for (const name of names) expect(admin[`--${name}`], name).toBeDefined();
  });
});

describe("translucent fills", () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return files(full);
      return /\.tsx?$/.test(entry) && !/\.test\./.test(entry) ? [full] : [];
    });

  it("are all measured: a text over one is darker, or lighter, than over the surface", () => {
    /** What nobody writes on: a dark plate behind a window, and a field that is off. */
    const unwritten = new Set(["plate", "input"]);
    const used = ["src/app/admin", "src/components/admin", "src/components/ui"].flatMap((dir) =>
      files(dir).flatMap((file) =>
        [...readFileSync(file, "utf8").matchAll(/\bbg-([a-z0-9-]+)\/(\d+)/g)].map(([, name, amount]) => ({
          file,
          name,
          amount: Number(amount),
        })),
      ),
    );
    expect(used.length).toBeGreaterThan(5);
    const amounts = (name: string) =>
      Object.entries(TINTS)
        .filter(([tint]) => tint.split(" ")[0] === name)
        .flatMap(([, tint]) => tint.amounts);
    expect(used.filter(({ name, amount }) => !unwritten.has(name) && !amounts(name).includes(amount))).toEqual([]);
  });

  it("have no translucent text over them, anywhere", () => {
    const texts = ["src/app/admin", "src/components/admin", "src/components/ui"].flatMap((dir) =>
      files(dir).flatMap((file) => [...readFileSync(file, "utf8").matchAll(/\btext-[a-z0-9-]+\/\d+/g)].map(([text]) => `${file}: ${text}`)),
    );
    // `text-xs/relaxed` and the like are sizes, not colours, and have no number.
    expect(texts).toEqual([]);
  });
});
