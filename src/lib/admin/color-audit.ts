import ts from "typescript";

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

type Finding = { line: number; text: string };

/**
 * Every utility that takes a colour. color-audit.test.ts compares it, and the
 * scale, with the Tailwind that is installed.
 */
const PREFIX = [
  "bg|text|decoration|divide|outline|accent|caret|fill|stroke|placeholder",
  "border(?:-(?:[trblxyse]|bs|be))?",
  "ring(?:-offset)?|inset-ring|(?:inset-|drop-|text-)?shadow",
  "(?:mask-(?:(?:[trblxy]|linear|radial|conic)-)?)?(?:from|to)|via",
  "scrollbar-(?:thumb|track)",
].join("|");

/** The names only the CLI version has; `--bg` is the theme's here. */
const CLI = "bg-dim|line|sel|comment|fg|cyan|green|orange|pink|purple|red|yellow";
/** Tailwind's own scale. */
const STOCK =
  "slate|gray|zinc|neutral|stone|mauve|olive|mist|taupe|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

/** The colours CSS has names for, and the ones of the system. */
const NAMED =
  "aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgr[ae]y|darkgreen|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategr[ae]y|darkturquoise|darkviolet|deeppink|deepskyblue|dimgr[ae]y|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gr[ae]y|green|greenyellow|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgr[ae]y|lightgreen|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategr[ae]y|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategr[ae]y|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen";
const SYSTEM =
  "accentcolor|accentcolortext|activetext|buttonborder|buttonface|buttontext|canvas|canvastext|field|fieldtext|graytext|highlight|highlighttext|linktext|mark|marktext|selecteditem|selecteditemtext|visitedtext";

/** Wherever they are written: nothing but a colour looks like this. */
const LITERALS = [
  // Not an entity, an anchor or an id: `#` after a quote, a space, a bracket, a colon. `%23` is `#` in a data URI.
  /(?:(?<=["'`\s[(:,_=])#|%23)(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi,
  /(?<![a-z0-9-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|device-cmyk|color)\([^)]*\)?/gi,
  new RegExp(
    String.raw`(?<![\w-])(?:${PREFIX})-(?:(?:${STOCK})-\d{2,3}|white|black|${CLI})(?![\w-])(?:/(?:[\w.%]+|\[[^\]\s]*\]|\([^)\s]*\)))?`,
    "g",
  ),
  new RegExp(String.raw`(?<![\w-])--color-(?:(?:${STOCK})-\d{2,3}|white|black)(?![\w-])`, "g"),
  new RegExp(String.raw`(?<![\w-])--(?:color-)?(?:${CLI})(?![\w-])`, "g"),
  new RegExp(String.raw`(?<![\w-])colors\.(?:(?:${STOCK})\.\d{2,3}|white|black)\b`, "g"),
  // An attribute of an SVG written as text.
  new RegExp(String.raw`(?<![\w-])(?:fill|stroke|color|stop-color|flood-color|lighting-color)=(?:\\?["']|%2[27])(?:${NAMED})\b`, "gi"),
];

const ANY_NAME = new RegExp(String.raw`(?<![\w-])(?:${NAMED}|${SYSTEM})(?![\w(-])`, "gi");
const ONLY_A_NAME = new RegExp(String.raw`^\s*(?:${NAMED})\s*$`, "i");
/** In a class, what is in brackets is a value, with `_` for the spaces; unless a variant, which ends in a colon. */
const BRACKETS = /(?:[\w-]+-)?(?:\[[^\s\]"'`]+\]|(?<=-)\([^\s)"'`]+\))(?!(?:\/[\w-]+)?:)/g;
const NAME_IN_BRACKETS = new RegExp(`(?<![a-z0-9-])(?:${NAMED}|${SYSTEM})(?![a-z0-9(-])`, "i");
const DECLARATION = /([-\w]+)\s*:((?:"[^"]*"|'[^']*'|[^;{}"'])*)(?=[;}])/g;
/** What tells a value (`1px solid red`, `linear-gradient(red, blue)`) from prose. */
const VALUE = /\d(?:px|r?em|%|deg)|\b(?:solid|dashed|dotted|double)\b|(?:gradient|shadow|mix)\(/;

type Found = { at: number; text: string };

const blank = (text: string) => text.replace(/[^\n]/g, " ");

function literals(text: string): Found[] {
  return LITERALS.flatMap((rule) => [...text.matchAll(rule)].map((match) => ({ at: match.index, text: match[0] })));
}

/** In what a declaration says, outside of its strings and addresses. */
function declared(text: string): Found[] {
  return [...text.matchAll(DECLARATION)].flatMap(([whole, property, value, ], i, all) => {
    const from = all[i].index + whole.length - value.length;
    const bare = value.replace(/"[^"]*"|'[^']*'|url\([^)]*\)/g, blank);
    return [...bare.matchAll(ANY_NAME)].map((name) => ({ at: from + name.index, text: `${property}: ${name[0]}` }));
  });
}

function inStylesheet(source: string): Found[] {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, blank);
  return [...literals(css), ...declared(css)];
}

/** One string of a screen, `styled` when it is inside of a `style` attribute. */
function inString(text: string, styled: boolean): Found[] {
  if (ONLY_A_NAME.test(text)) return [{ at: text.search(/\S/), text: text.trim() }];
  const classes = [...text.matchAll(BRACKETS)]
    .filter(([brackets]) => NAME_IN_BRACKETS.test(brackets.slice(brackets.search(/[[(]/))))
    .map((match) => ({ at: match.index, text: match[0] }));
  const value = styled || VALUE.test(text.replace(BRACKETS, blank));
  const names = value ? [...text.replace(BRACKETS, blank).matchAll(ANY_NAME)].map((name) => ({ at: name.index, text: name[0] })) : [];
  return [...literals(text), ...classes, ...(/[;}]/.test(text) ? declared(text) : []), ...names];
}

/** Every string of a screen: an identifier, a comment and the text of the page paint nothing. */
function inScreen(source: string): Found[] {
  const file = ts.createSourceFile("screen.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: Found[] = [];
  const visit = (node: ts.Node, styled: boolean) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isTypeNode(node)) return;
    const inside = styled || (ts.isJsxAttribute(node) && node.name.getText(file) === "style");
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddleOrTemplateTail(node)) {
      const start = node.getStart(file) + 1;
      const end = node.end - (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) ? 2 : 1);
      for (const { at, text } of inString(source.slice(start, end), inside)) found.push({ at: start + at, text });
    }
    ts.forEachChild(node, (child) => visit(child, inside));
  };
  visit(file, false);
  return found;
}

export function findColors(file: string, source: string): Finding[] {
  const found = file.endsWith(".css") ? inStylesheet(source) : inScreen(source);
  const seen = new Set<string>();
  return found
    .sort((a, b) => a.at - b.at)
    .map(({ at, text }) => ({ line: source.slice(0, at).split("\n").length, text: text.trim(), at }))
    .filter(({ at, text }) => !seen.has(`${at} ${text}`) && seen.add(`${at} ${text}`))
    .map(({ line, text }) => ({ line, text }));
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
  const found = findColors(file, source);
  return [
    ...found.filter(({ text }) => !allowed.has(text)).map(({ line, text }) => `${file}:${line}: ${text}`),
    ...[...allowed]
      .filter((color) => !found.some(({ text }) => text === color))
      .map((color) => `${file}: the exception for ${color} is no longer used`),
  ];
}
