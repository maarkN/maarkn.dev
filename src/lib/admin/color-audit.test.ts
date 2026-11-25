import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { __unstable__loadDesignSystem as loadDesignSystem } from "tailwindcss";
import { describe, expect, it } from "vitest";
import { readBlocks } from "../site-tokens";
import { auditColors, EXCEPTIONS, findColors } from "./color-audit";

const screen = (source: string) => findColors("screen.tsx", source).map(({ text }) => text);
const sheet = (source: string) => findColors("sheet.css", source).map(({ text }) => text);
const classes = (names: string) => screen(`<p className="${names}" />`);

describe("findColors, in a screen", () => {
  it("finds a colour of Tailwind's own scale, in every utility that takes one", () => {
    expect(classes("bg-neutral-100 hover:text-amber-400 bg-black/10 text-white")).toEqual([
      "bg-neutral-100",
      "text-amber-400",
      "bg-black/10",
      "text-white",
    ]);
    for (const utility of [
      ...["border-l-red-500", "border-t-white", "border-x-amber-400/30", "border-s-black", "border-be-mauve-200"],
      ...["ring-offset-red-500", "inset-ring-white", "drop-shadow-black/50", "text-shadow-lime-300", "inset-shadow-sky-500"],
      ...["from-black", "mask-t-from-white", "fill-red-500", "stroke-black/[.5]", "divide-white/(--x)"],
    ]) {
      expect(classes(`p-2 data-active:${utility}! text-ok`), utility).toEqual([utility]);
    }
  });

  it("knows every utility and every colour of the Tailwind that is installed", async () => {
    const from = createRequire(import.meta.url);
    const tailwind = await loadDesignSystem('@import "tailwindcss";', {
      base: process.cwd(),
      loadStylesheet: async (id) => {
        const path = from.resolve(id === "tailwindcss" ? "tailwindcss/index.css" : id);
        return { path, base: process.cwd(), content: readFileSync(path, "utf8") };
      },
    });
    const names = tailwind.getClassList().map(([name]) => name);
    const candidates = names.filter((name) => /^bg-|-(?:red-500|white|black)$/.test(name));
    const css = tailwind.candidatesToCss(candidates);
    const painting = candidates.filter((_, i) => css[i]?.includes("var(--color-"));
    expect(painting.length).toBeGreaterThan(300);
    expect(painting.filter((name) => classes(name)[0] !== name)).toEqual([]);
  });

  it("finds a colour in an arbitrary value, by any of its names", () => {
    expect(classes("text-[#ff0000]")).toEqual(["#ff0000"]);
    expect(classes("shadow-[0_0_2px_rgba(0,0,0,.5)]")).toEqual(["rgba(0,0,0,.5)"]);
    expect(classes("bg-[color(display-p3_1_0_0)]")).toEqual(["color(display-p3_1_0_0)"]);
    for (const value of [
      ...["bg-[red]", "text-[color:tomato]", "border-[1px_solid_black]", "[color:navy]", "[--x:red]", "bg-[CanvasText]"],
      ...["bg-[linear-gradient(90deg,red,var(--bg))]", "bg-(--nothing,rebeccapurple)"],
    ]) {
      expect(classes(`p-2 hover:${value}`), value).toEqual([value]);
    }
  });

  it("finds it outside of the classes: attributes, styles and values", () => {
    expect(screen(`<path fill="red" stroke={"black"} stopColor={on ? "Gold" : undefined} />`)).toEqual(["red", "black", "Gold"]);
    expect(screen(`<p style={{ outlineColor: "tomato", border: on ? "thin red" : "0" }} />`)).toEqual(["tomato", "red"]);
    expect(screen(`<p style={{ color: "CanvasText", background: \`linear-gradient(\${angle}deg, navy, var(--bg))\` }} />`)).toEqual([
      "CanvasText",
      "navy",
    ]);
    expect(screen(`const line = "1px solid black"; const light = "drop-shadow(0 0 2px white)"; const fill = "teal";`)).toEqual([
      "black",
      "white",
      "teal",
    ]);
    expect(screen("<style>{`.a { color: red; }`}</style>")).toEqual(["color: red"]);
    expect(screen(`const url = "data:image/svg+xml,%3Cpath fill='red' stroke='%23fff'/%3E";`)).toEqual(["fill='red", "%23fff"]);
  });

  it("finds the colours of the CLI version, which do not change with the theme", () => {
    expect(classes("text-green data-active:bg-sel! border-orange/30 border-b-green ring-offset-pink")).toEqual([
      "text-green",
      "bg-sel",
      "border-orange/30",
      "border-b-green",
      "ring-offset-pink",
    ]);
    expect(classes("text-(--purple) bg-(color:--color-green) border-[var(--line)]")).toEqual(["--purple", "--color-green", "--line"]);
    expect(screen(`<p style={{ color: "var(--purple)" }} />`)).toEqual(["--purple"]);
  });

  it("leaves the theme's own alone, and what only looks like a colour", () => {
    for (const fine of [
      `<p className="text-ok bg-bg bg-bg-2 text-ink-3 border-line-2 border-l-brand text-foreground/60 bg-muted/50" />`,
      `<p className="font-black text-(--beam) bg-[color-mix(in_oklab,var(--beam)_10%,transparent)] text-[11px] w-[24ch]" />`,
      `<p className="data-[tone=red]:p-2 group-data-[state=gold]/card:p-2 [&_.tan]:p-2" />`,
      `<path fill="currentColor" stroke="none" /> `,
      `<p style={{ color: "var(--beam)", background: "transparent" }}>red, rgb(0 0 0) and #fff</p>`,
      `<a href="#content" title="10 de coral, e não white">a</a>`,
      `const entity = "&#039;"; const url = "https://example.com/a/b/red";`,
      `// a comment may say #ff0000, text-green and white`,
      `/* and so may\n   this: rgb(0 0 0) */`,
      `import white from "./white"; type Tone = "red" | "green"; const red = green;`,
    ]) {
      expect(screen(fine), fine).toEqual([]);
    }
  });
});

describe("findColors, in a stylesheet", () => {
  it("finds every way of writing a colour", () => {
    expect(sheet(`.a { color: #fff; }`)).toEqual(["#fff"]);
    expect(sheet(`.a { box-shadow: 0 0 2px rgb(0 0 0 / .4); }`)).toEqual(["rgb(0 0 0 / .4)"]);
    expect(sheet(`.a { color: oklch(70% .1 200); background: color(display-p3 1 0 0); }`)).toEqual([
      "oklch(70% .1 200)",
      "color(display-p3 1 0 0)",
    ]);
    expect(sheet(`.a { color: light-dark(#000, white) }`)).toEqual(["color: white", "#000"].sort());
    expect(sheet(`@media (min-width: 1px) { .a { @apply bg-red-500; color: var(--color-red-500) } }`)).toEqual([
      "bg-red-500",
      "--color-red-500",
    ]);
  });

  it("finds a colour by its name, in any property, however many lines it takes", () => {
    for (const [declaration, text] of [
      ["background: white", "background: white"],
      ["color: navy", "color: navy"],
      ["color: RebeccaPurple !important", "color: RebeccaPurple"],
      ["text-shadow: 0 0 2px black", "text-shadow: black"],
      ["filter: drop-shadow(0 0 2px black)", "filter: black"],
      ["border-inline-start: 1px solid black", "border-inline-start: black"],
      ["--x: red", "--x: red"],
      ["box-shadow:\n    0 0 1px var(--beam),\n    0 0 2px gray", "box-shadow: gray"],
      ["background: linear-gradient(to right, red, var(--bg))", "background: red"],
      ["color: color-mix(in srgb, tomato 10%, var(--bg))", "color: tomato"],
      ["color: CanvasText", "color: CanvasText"],
    ]) {
      expect(sheet(`.a { ${declaration}; }`), declaration).toEqual([text]);
      expect(sheet(`.a:hover, .b { margin: 0; ${declaration} }`), declaration).toEqual([text]);
    }
  });

  it("finds the colours of the CLI version", () => {
    expect(sheet(`.a { color: color-mix(in srgb, var(--purple) 10%, transparent); }`)).toEqual(["--purple"]);
    const tokens = readBlocks(readFileSync("src/app/globals.css", "utf8")).find(({ selector }) => selector === ":root")!.tokens;
    const colors = Object.entries(tokens).flatMap(([name, value]) => (value.startsWith("#") && name !== "--bg" ? [name] : []));
    expect(colors.length).toBeGreaterThan(10);
    for (const name of colors) expect(sheet(`.a { background: var(${name}); }`)).toEqual([name]);
  });

  it("leaves the theme's own alone, and what only looks like a colour", () => {
    for (const fine of [
      `.a { color: var(--beam); background: color-mix(in srgb, var(--ink-3) 35%, transparent); white-space: nowrap; }`,
      `.a { color: currentColor; background: none; transition: white-space 1s; width: calc(1px * tan(45deg)); }`,
      `.red, .a:hover, #tan { font-family: "Arial Black"; content: "red"; background: url(/white/red.svg); }`,
      `@media (color: 8) and (prefers-color-scheme: dark) { .a { margin: 0 } }`,
      `/* and so may\n   this: rgb(0 0 0); red */`,
    ]) {
      expect(sheet(fine), fine).toEqual([]);
    }
  });

  it("says which line", () => {
    expect(findColors("a.css", `/* #fff\n */\n.a {\n  color: #fff;\n  margin:\n    0 red;\n}`)).toEqual([
      { line: 4, text: "#fff" },
      { line: 6, text: "margin: red" },
    ]);
    expect(findColors("a.tsx", `/* #fff\n */\n<p\n  className="\n    text-white" />`)).toEqual([{ line: 5, text: "text-white" }]);
  });
});

describe("auditColors", () => {
  it("points at the file when a screen gets a colour of its own", () => {
    expect(auditColors("src/app/admin/page.tsx", `\n<p className="text-red-500" />`)).toEqual([
      "src/app/admin/page.tsx:2: text-red-500",
    ]);
  });

  it("accepts what is documented, and only there", () => {
    const [file] = Object.keys(EXCEPTIONS);
    const colors = EXCEPTIONS[file].colors;
    expect(auditColors(file, `"${colors.join(" ")}"`)).toEqual([]);
    expect(auditColors("src/app/admin/page.tsx", `"${colors.join(" ")}"`)).toHaveLength(colors.length);
  });

  it("refuses an exception that is no longer needed", () => {
    expect(auditColors("a.tsx", "", { "a.tsx": { colors: ["text-white"], why: "gone" } })).toEqual([
      "a.tsx: the exception for text-white is no longer used",
    ]);
  });

  it("is what `pnpm lint` runs", () => {
    expect(JSON.parse(readFileSync("package.json", "utf8")).scripts.lint).toContain("check-admin-colors.ts");
  });
});
