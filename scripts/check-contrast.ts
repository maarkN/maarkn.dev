/**
 * Contrast of the three themes. The site: every text over every surface it
 * appears on, the edges of the holograms, and the pair of chart series (contrast,
 * lightness, and distance for colour-blind readers). The backoffice: every pair
 * of its own vocabulary.
 *
 *   pnpm exec tsx scripts/check-contrast.ts            (also inside `pnpm lint`)
 *   pnpm exec tsx scripts/check-contrast.ts --verbose  (every pair)
 *
 * The colours are read from src/app/site.css and src/app/admin/admin.css, not typed here. Exits 1 and lists
 * each pair below its minimum.
 */
import { auditAdmin, readAdminTokens } from "../src/lib/admin/contrast-audit";
import { SITE_THEMES } from "../src/lib/site-theme";
import { readFills, readPalettes } from "../src/lib/site-tokens";
import { auditTheme, fails } from "../src/lib/theme-audit";

const verbose = process.argv.includes("--verbose");
const palettes = readPalettes();
const fills = readFills();
const admin = readAdminTokens();
const measures = SITE_THEMES.flatMap((theme) => [
  ...auditTheme(theme, palettes[theme], fills),
  ...auditAdmin(theme, palettes[theme], admin),
]);
const failed = measures.filter(fails);

const line = ({ theme, pair, value, min, max }: (typeof measures)[number]) =>
  `${theme.padEnd(8)} ${pair.padEnd(62)} ${value.toFixed(2).padStart(6)}  (${
    max === undefined ? `min ${min}` : `${min} to ${max}`
  })`;

if (verbose) console.log(measures.map(line).join("\n"));

if (failed.length > 0) {
  console.error(`check-contrast: ${failed.length} of ${measures.length} pairs out of range\n${failed.map(line).join("\n")}`);
  process.exit(1);
}

const closest = measures
  .filter(({ max }) => max === undefined)
  .reduce((a, b) => (b.value / b.min < a.value / a.min ? b : a));
console.log(
  `check-contrast: ${measures.length} pairs in ${SITE_THEMES.length} themes, all in range; closest: ${line(closest).replace(/\s+/g, " ")}`,
);
