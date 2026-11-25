import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { experienceLines } from "./listings";

const ITEMS = ["acme", "globex"].map((slug) => ({
  slug,
  period: "2024 to 2025",
  company: slug,
  role: "Engineer",
  summary: "What was done.",
}));
const OPTIONS = { lang: "en", readCase: "read full case" };

describe("experienceLines", () => {
  it("gives each entry the anchor of /career#<slug>, and the terminal none", () => {
    const ids = (html: string) => [...html.matchAll(/ id="([^"]+)"/g)].map(([, id]) => id);
    expect(ids(renderToStaticMarkup(<>{experienceLines(ITEMS, OPTIONS)}</>))).toEqual(["acme", "globex"]);
    expect(ids(renderToStaticMarkup(<>{experienceLines(ITEMS, { ...OPTIONS, anchors: false })}</>))).toEqual([]);
  });

  it("leaves where a scroll to it stops to the page, which knows what is over it", () => {
    expect(renderToStaticMarkup(<>{experienceLines(ITEMS, OPTIONS)}</>)).not.toContain("style=");
  });
});
