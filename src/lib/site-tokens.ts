import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SITE_THEMES, type SiteTheme } from "./site-theme";

/**
 * The site's tokens as declared in src/app/site.css, for what has to measure or
 * compare them (the token test, scripts/check-contrast.ts). Not for the app:
 * there they are CSS variables.
 */

const SITE_CSS = join(process.cwd(), "src", "app", "site.css");

export type Tokens = Record<string, string>;

/** One rule of the stylesheet: selector (or the at-rule around it) and declarations. */
export type Block = { media: string | null; selector: string; tokens: Tokens };

/** A small reader for the flat CSS of site.css: rules, at most one `@media` deep. */
export function readBlocks(css = readFileSync(SITE_CSS, "utf8")): Block[] {
  const blocks: Block[] = [];
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let media: string | null = null;
  let prelude = "";
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "{") {
      const selector = prelude.trim().replace(/\s+/g, " ");
      prelude = "";
      if (selector.startsWith("@media")) {
        media = selector;
        continue;
      }
      const end = source.indexOf("}", i);
      const tokens: Tokens = {};
      for (const declaration of source.slice(i + 1, end).split(";")) {
        const at = declaration.indexOf(":");
        if (at > 0) tokens[declaration.slice(0, at).trim()] = declaration.slice(at + 1).trim();
      }
      blocks.push({ media, selector, tokens });
      i = end;
    } else if (char === "}") {
      media = null;
    } else if (char === ";") {
      prelude = ""; // `@import …;`
    } else {
      prelude += char;
    }
  }
  return blocks;
}

/** The blocks that declare a palette: the ones with a `--bg`. */
export function paletteBlocks(blocks = readBlocks()): Block[] {
  return blocks.filter((block) => "--bg" in block.tokens);
}

/** The palette of each theme, colours only, keyed by token name. */
export function readPalettes(blocks = readBlocks()): Record<SiteTheme, Tokens> {
  const palettes = {} as Record<SiteTheme, Tokens>;
  for (const theme of SITE_THEMES) {
    const block = paletteBlocks(blocks).find(
      ({ media, selector }) => !media && selector.includes(`[data-site-theme="${theme}"]`),
    );
    if (!block) throw new Error(`site.css has no palette for "${theme}"`);
    palettes[theme] = Object.fromEntries(
      Object.entries(block.tokens).filter(([name]) => name.startsWith("--")),
    );
  }
  return palettes;
}

/** How much beam each layer of a hologram carries, 0–1 (`--fill-*`, `--panel-*`). */
export type Fills = Record<"rest" | "dense" | "scan" | "light" | "panelRest" | "panelScan" | "panelLight", number>;

export function readFills(blocks = readBlocks()): Fills {
  const tokens = Object.assign({}, ...blocks.map((block) => block.tokens)) as Tokens;
  const amount = (name: string) => {
    const value = Number.parseFloat(tokens[name]);
    if (!Number.isFinite(value)) throw new Error(`site.css has no ${name}`);
    return value / 100;
  };
  return {
    rest: amount("--fill-rest"),
    dense: amount("--fill-dense"),
    scan: amount("--fill-scan"),
    light: amount("--fill-light"),
    panelRest: amount("--panel-rest"),
    panelScan: amount("--panel-scan"),
    panelLight: amount("--panel-light"),
  };
}
