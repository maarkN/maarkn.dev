/**
 * The backoffice takes every colour from the theme that is on (spec
 * `admin-theme`, "Tokens do backoffice derivados do tema").
 *
 *   pnpm exec tsx scripts/check-admin-colors.ts   (also inside `pnpm lint`)
 *
 * Exits 1 and lists file:line:literal. What counts as a literal, and the
 * documented exceptions, are in src/lib/admin/color-audit.ts.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { auditColors, EXCEPTIONS } from "../src/lib/admin/color-audit";

const ROOT = process.cwd();
const SCOPE = ["src/app/admin", "src/components/admin", "src/components/ui"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(tsx?|css)$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
  });
}

const files = SCOPE.flatMap((dir) => walk(join(ROOT, dir))).map((file) => relative(ROOT, file).split(sep).join("/"));
const problems = [
  ...files.flatMap((file) => auditColors(file, readFileSync(join(ROOT, file), "utf8"))),
  ...Object.keys(EXCEPTIONS)
    .filter((file) => !files.includes(file))
    .map((file) => `${file}: has an exception and does not exist`),
];

if (problems.length > 0) {
  console.error(
    `check-admin-colors: ${problems.length} problem(s). The backoffice takes its colours from the theme ` +
      `(src/app/admin/admin.css, src/app/site.css):\n${problems.map((problem) => `  - ${problem}`).join("\n")}`,
  );
  process.exit(1);
}

console.log(
  `check-admin-colors: ${files.length} files, every colour from the theme; ${Object.keys(EXCEPTIONS).length} documented exceptions`,
);
