/**
 * Paint that does not come from the theme, in the source of the backoffice.
 * Run by scripts/check-admin-colors.ts, inside `pnpm lint`. Pure: text in,
 * findings out.
 *
 * Two kinds are refused. A literal colour stays as it is in the three themes. A
 * colour of the CLI version (`text-green`, `var(--purple)`) exists on `:root`,
 * so it paints, but it belongs to another theme system and does not change when
 * the theme does.
 */

export type Finding = { line: number; text: string };

const PREFIX =
  "bg|text|border|ring|outline|fill|stroke|shadow|caret|accent|decoration|divide|placeholder|from|via|to|after:bg|before:bg";

/** The names only the CLI version has; `--bg` is the theme's here. */
const CLI = "bg-dim|line|sel|comment|fg|cyan|green|orange|pink|purple|red|yellow";
const STOCK =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

const LITERALS = [
  // Not an entity, an anchor or an id: `#` after a quote, a space, a bracket, a colon.
  /(?<=["'`\s[(:,_])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi,
  /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([^)]*\)?/gi,
  new RegExp(`\\b(?:${PREFIX})-(?:${STOCK})-\\d{2,3}(?:/\\d+)?\\b`, "g"),
  new RegExp(`\\b(?:${PREFIX})-(?:white|black)(?:/\\d+)?\\b`, "g"),
  new RegExp(`\\b(?:${PREFIX})-(?:${CLI})(?![\\w-])(?:/\\d+)?`, "g"),
  new RegExp(`var\\(--(?:color-)?(?:${CLI})\\b`, "g"),
  // Stylesheets and inline styles: a declaration whose value is a colour keyword.
  /(?:color|background|border(?:-[a-z]+)?|fill|stroke|outline|box-shadow)\s*:\s*["'`]?[^;{}"'`]*\b(?:white|black|red|green|blue|yellow|orange|purple|pink|cyan|magenta|gray|grey|silver)\b(?!-)/gi,
];

/** Comments go, lines stay: prose may name a colour. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/(^|[\s;{}(),])\/\/[^\n]*/g, "$1");
}

export function findColors(source: string): Finding[] {
  const findings: Finding[] = [];
  withoutComments(source)
    .split("\n")
    .forEach((text, index) => {
      for (const rule of LITERALS) {
        for (const match of text.matchAll(rule)) findings.push({ line: index + 1, text: match[0].trim() });
      }
    });
  return findings;
}

/**
 * The paint that is meant to be there. One entry per file, with every literal it
 * may have; one that is no longer in the file is refused too.
 */
export const EXCEPTIONS: Record<string, { colors: string[]; why: string }> = {
  "src/app/admin/generator/[id]/page.tsx": {
    colors: ["bg-white", "text-neutral-900", "border-neutral-200", "text-neutral-500"],
    why: "the sheet of paper the browser prints to PDF: white paper, dark ink, in every theme",
  },
  "src/app/admin/projects/page.tsx": {
    colors: ["text-white"],
    why: "the monogram over the gradient of the project itself, which is data",
  },
  "src/components/admin/project-form.tsx": {
    colors: ["#4f6ef7", "#22d3ee"],
    why: "what a new project's gradient starts with: data the form edits, not paint",
  },
};

/** What is wrong with one file: literals outside its exception, and exceptions it no longer uses. */
export function auditColors(file: string, source: string, exceptions = EXCEPTIONS): string[] {
  const allowed = new Set(exceptions[file]?.colors);
  const found = findColors(source);
  return [
    ...found.filter(({ text }) => !allowed.has(text)).map(({ line, text }) => `${file}:${line}: ${text}`),
    ...[...allowed]
      .filter((color) => !found.some(({ text }) => text === color))
      .map((color) => `${file}: the exception for ${color} is no longer used`),
  ];
}
