import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditColors, EXCEPTIONS, findColors } from "./color-audit";

const found = (source: string) => findColors(source).map(({ text }) => text);

describe("findColors", () => {
  it("finds every way of writing a colour that is not the theme's", () => {
    expect(found(`<p className="text-[#ff0000]" />`)).toEqual(["#ff0000"]);
    expect(found(`.a { color: #fff; }`)).toEqual(["#fff"]);
    expect(found(`.a { box-shadow: 0 0 2px rgb(0 0 0 / .4); }`)).toEqual(["rgb(0 0 0 / .4)"]);
    expect(found(`.a { color: oklch(70% .1 200); }`)).toEqual(["oklch(70% .1 200)"]);
    expect(found(`<p className="bg-neutral-100 hover:text-amber-400" />`)).toEqual(["bg-neutral-100", "text-amber-400"]);
    expect(found(`<p className="bg-black/10 text-white" />`)).toEqual(expect.arrayContaining(["bg-black/10", "text-white"]));
    expect(found(`.a { background: white; }`)).toEqual(["background: white"]);
  });

  it("finds the colours of the CLI version, which do not change with the theme", () => {
    expect(found(`<p className="text-green data-active:bg-sel! border-orange/30" />`)).toEqual([
      "text-green",
      "bg-sel",
      "border-orange/30",
    ]);
    expect(found(`.a { color: color-mix(in srgb, var(--purple) 10%, transparent); }`)).toContain("var(--purple");
    expect(found(`.a { background: var(--bg-dim); }`)).toContain("var(--bg-dim");
  });

  it("leaves the theme's own alone, and what only looks like a colour", () => {
    for (const fine of [
      `<p className="text-ok bg-bg bg-bg-2 text-ink-3 border-line-2 text-foreground/60 bg-muted/50" />`,
      `.a { color: var(--beam); background: color-mix(in srgb, var(--ink-3) 35%, transparent); white-space: nowrap; }`,
      `<a href="#content">a</a>`,
      `const entity = "&#039;";`,
      `const url = "https://example.com/a";`,
      `// a comment may say #ff0000, text-green and white`,
      `/* and so may\n   this: rgb(0 0 0) */`,
    ]) {
      expect(found(fine), fine).toEqual([]);
    }
  });

  it("says which line", () => {
    expect(findColors(`/* #fff\n */\n.a {\n  color: #fff;\n}`)).toEqual([{ line: 4, text: "#fff" }]);
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
