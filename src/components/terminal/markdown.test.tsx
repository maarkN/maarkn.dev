// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Markdown } from "./markdown";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

let root: Root;
let container: HTMLDivElement;

function render(text: string) {
  act(() => root.render(<Markdown text={text} />));
  return container;
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Markdown", () => {
  it("renders paragraphs, bold, italic and inline code without leaving the mono face", () => {
    const el = render("I use **TypeScript** and *Go* — see `pnpm test`.\n\nSecond paragraph.");
    const ps = el.querySelectorAll("p");
    expect(ps).toHaveLength(2);
    expect(el.querySelector('span[class*="_b_"]')?.textContent).toBe("TypeScript");
    expect(el.querySelector("em")?.textContent).toBe("Go");
    expect(el.querySelector("code")?.textContent).toBe("pnpm test");
    expect(el.querySelector("pre")).toBeNull();
  });

  it("renders lists with markers and links that open externally in a new tab", () => {
    const el = render(
      "Two things:\n- the [repo](https://github.com/maarkn) is public\n- the case is at [/en/projects](/en/projects)\n1. numbered too\n\nAlso https://maarkn.dev/en/career.",
    );
    const items = [...el.querySelectorAll("li")].map((li) => li.textContent);
    expect(items).toEqual([
      "- the repo is public",
      "- the case is at /en/projects",
      "1. numbered too",
    ]);
    const links = [...el.querySelectorAll("a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "https://github.com/maarkn",
      "/en/projects",
      "https://maarkn.dev/en/career",
    ]);
    expect(links[0].getAttribute("target")).toBe("_blank");
    expect(links[0].getAttribute("rel")).toBe("noopener noreferrer");
    expect(links[1].getAttribute("target")).toBeNull();
    expect(links[2].textContent).toBe("maarkn.dev/en/career");
  });

  it("renders fenced code and headings, tolerating an unfinished fence while streaming", () => {
    const el = render("# Stack\n```ts\nconst a = 1;\n```\ntext\n```\nstill open");
    expect(el.querySelector('p span[class*="_p_"] span[class*="_b_"]')?.textContent).toBe("Stack");
    const pres = el.querySelectorAll("pre");
    expect(pres).toHaveLength(2);
    expect(pres[0].textContent).toBe("const a = 1;");
    expect(pres[0].getAttribute("data-lang")).toBe("ts");
    expect(pres[1].textContent).toBe("still open");
  });
});
