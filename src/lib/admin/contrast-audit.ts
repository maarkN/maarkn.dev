import { readFileSync } from "node:fs";
import { join } from "node:path";
import { blend, contrast } from "../contrast";
import type { SiteTheme } from "../site-theme";
import { readBlocks, type Tokens } from "../site-tokens";
import type { Measure } from "../theme-audit";

/**
 * Every pair of the backoffice that has a minimum, in one theme: the shadcn
 * vocabulary as src/app/admin/admin.css declares it, over every surface a screen
 * paints. Run by scripts/check-contrast.ts. Pure but for reading the stylesheet.
 */

const ADMIN_CSS = join(process.cwd(), "src", "app", "admin", "admin.css");
const TEXT = 4.5;
const EDGE = 3;

/** What a screen may write on. */
const SURFACES = ["background", "card", "popover", "secondary", "muted", "accent"];

/** What a screen may write with, wherever it writes. The second line is the site's own. */
const INKS = [
  ...["foreground", "card-foreground", "popover-foreground", "muted-foreground", "destructive", "brand"],
  ...["ok", "warn", "ink-3", "beam-2", "beam-3"],
];

/** Solid fills, and their text. */
const FILLS = [
  ["primary", "primary-foreground"],
  ["destructive", "destructive-foreground"],
  ["secondary", "secondary-foreground"],
  ["accent", "accent-foreground"],
];

/**
 * Translucent fills (`bg-brand/15`): the text written over each, with the
 * surface showing through. contrast-audit.test.ts looks for the ones the code
 * uses and this list does not have.
 */
export const TINTS: Record<string, { ink: string; amounts: number[] }> = {
  primary: { ink: "primary-foreground", amounts: [80] },
  destructive: { ink: "foreground", amounts: [10, 20] },
  "destructive solid": { ink: "destructive-foreground", amounts: [90] },
  secondary: { ink: "secondary-foreground", amounts: [80] },
  brand: { ink: "foreground", amounts: [15, 20] },
  warn: { ink: "foreground", amounts: [10] },
  muted: { ink: "muted-foreground", amounts: [30, 40, 50] },
};

/** The edges of a control: at rest, focused, checked and invalid. */
const EDGES = ["input", "ring", "primary", "destructive"];

/** The declarations of `body.admin-root`, by token name. */
export function readAdminTokens(css = readFileSync(ADMIN_CSS, "utf8")): Tokens {
  const block = readBlocks(css).find(({ selector }) => selector === "body.admin-root");
  if (!block) throw new Error("admin.css has no body.admin-root");
  return block.tokens;
}

export function auditAdmin(theme: SiteTheme, palette: Tokens, admin: Tokens): Measure[] {
  const measures: Measure[] = [];
  const color = (name: string): string => {
    const value = admin[`--${name}`] ?? palette[`--${name}`];
    if (!value) throw new Error(`the backoffice has no --${name} in ${theme}`);
    const token = /^var\(--([a-z0-9-]+)\)$/.exec(value)?.[1];
    return token ? color(token) : value;
  };
  const check = (pair: string, over: string, under: string, min: number) =>
    measures.push({ theme, pair: `backoffice: ${pair}`, value: contrast(over, under), min });

  for (const surface of SURFACES) {
    const under = color(surface);
    for (const ink of INKS) check(`${ink} on ${surface}`, color(ink), under, TEXT);
    for (const edge of EDGES) check(`${edge} edge on ${surface}`, color(edge), under, EDGE);
    for (const [name, { ink, amounts }] of Object.entries(TINTS)) {
      for (const amount of amounts) {
        const tint = blend(color(name.split(" ")[0]), under, amount / 100);
        check(`${ink} on ${name}/${amount} over ${surface}`, color(ink), tint, TEXT);
      }
    }
  }
  for (const [fill, ink] of FILLS) check(`${ink} on ${fill}`, color(ink), color(fill), TEXT);
  return measures;
}
