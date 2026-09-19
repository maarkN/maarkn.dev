// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminChrome } from "./admin-chrome";
import { NAV } from "./admin-tree-nav";

let pathname = "/admin";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
// The logout Server Action cannot be imported outside the Next bundler.
vi.mock("@/app/_actions/auth", () => ({ logoutAction: vi.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

function render(at: string, name?: string) {
  pathname = at;
  act(() => {
    root.render(
      <AdminChrome email="admin@maarkn.dev" name={name}>
        <p>conteúdo</p>
      </AdminChrome>,
    );
  });
}

/** What a screen reader would announce: `aria-hidden` subtrees removed. */
function accessibleText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll("[aria-hidden='true']").forEach((n) => n.remove());
  return (clone.textContent ?? "").trim();
}

const bar = () => container.querySelector("header")!;
const crumb = () => container.querySelector("nav[aria-label='Comando desta tela']")!;
const back = () => container.querySelector("footer a") as HTMLAnchorElement;
const rows = () => [
  ...container.querySelectorAll<HTMLElement>("nav[aria-label='Navegação do backoffice'] li > *"),
];

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("AdminChrome", () => {
  /** rota → [caminho, comando] — a tabela normativa do design.md. */
  const TABLE: Record<string, [string, string]> = {
    "/admin": ["~/admin", "ls"],
    "/admin/applications": ["~/admin/applications", "ls applications/"],
    "/admin/applications/board": ["~/admin/applications", "ls applications/ --group-by=stage"],
    "/admin/applications/new": ["~/admin/applications/new", "touch applications/new.md"],
    "/admin/jobs": ["~/admin/jobs", "ls jobs/"],
    "/admin/contacts": ["~/admin/contacts", "ls contacts/"],
    "/admin/projects": ["~/admin/projects", "ls projects/"],
    "/admin/projects/new": ["~/admin/projects/new", "touch projects/new.md"],
    "/admin/projects/p1/edit": ["~/admin/projects/p1", "vim projects/p1.md"],
    "/admin/generator": ["~/admin/generator", "ls generations/"],
    "/admin/generator/g1": ["~/admin/generator/g1", "less generations/g1.md"],
    "/admin/api-keys": ["~/admin/api-keys", "cat authorized_keys"],
    "/admin/audit": ["~/admin/audit", "tail -f audit.log"],
    "/admin/chat": ["~/admin/chat", "tail chat.log"],
    "/admin/settings": ["~/admin/settings", "vim ~/.config/admin.conf"],
  };

  it("dresses every authenticated route with the path and command of the table", () => {
    for (const [route, [path, command]] of Object.entries(TABLE)) {
      render(route);
      expect(bar().textContent, route).toContain(path);
      expect(crumb().textContent, route).toContain(command);
    }

    // The two record screens, with the folderName the page passes down.
    render("/admin/applications/clx1", "shopify-senior-backend-ca");
    expect(bar().textContent).toContain("~/admin/applications/shopify-senior-backend-ca");
    expect(crumb().textContent).toContain("cat applications/shopify-senior-backend-ca.md");

    render("/admin/applications/clx1/edit", "shopify-senior-backend-ca");
    expect(crumb().textContent).toContain("vim applications/shopify-senior-backend-ca.md");
    expect(back().getAttribute("href")).toBe("/admin/applications/clx1");
  });

  it("offers `cd ..` back to the listing, and to ~ from the dashboard", () => {
    render("/admin/applications/new");
    expect(back().textContent).toBe("cd ..");
    expect(back().getAttribute("href")).toBe("/admin/applications");

    render("/admin/applications");
    expect(back().getAttribute("href")).toBe("/admin");

    render("/admin");
    expect(back().getAttribute("href")).toBe("/");
  });

  it("offers `exit` and nothing else in the bar — no palette, font or language", () => {
    render("/admin");
    const buttons = [...bar().querySelectorAll("button")];
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe("exit");
    expect(bar().textContent).toContain("maarkn@dev");
    expect(bar().textContent).toMatch(/\d\d:\d\d|--:--/);
  });

  it("renders the menu as a tree of 14 entries with the icons in a fixed box", () => {
    render("/admin/applications");
    const items = rows();
    expect(items).toHaveLength(14);
    expect(items).toHaveLength(NAV.length);

    for (const [i, el] of items.entries()) {
      const [tick, icon, label] = [...el.children];
      // connector · icon · label — always three cells, always in this order,
      // so the icon can never push the label out of its column.
      expect(el.children).toHaveLength(3);
      expect(tick.getAttribute("aria-hidden")).toBe("true");
      expect(icon.getAttribute("aria-hidden")).toBe("true");
      expect(icon.querySelector("svg")).not.toBeNull();
      expect(label.textContent).toContain(NAV[i].name);
      // Every connector of a level is the same width, so every label of that
      // level starts on the same column.
      expect(tick.textContent).toHaveLength(NAV[i].child ? 8 : 4);
    }
    // One entry is indented: `board`, under `applications/`.
    expect(items.filter((el) => el.children[0].textContent?.length === 8)).toHaveLength(1);
    expect(items[3].children[0].textContent).toBe("│   └── ");
    expect(items[13].children[0].textContent).toBe("└── ");
  });

  it("announces the entry names only — no connectors, no icons", () => {
    render("/admin");
    for (const [i, el] of rows().entries()) {
      const expected = NAV[i].ready ? NAV[i].name : `${NAV[i].name}  # em breve`;
      expect(accessibleText(el)).toBe(expected);
    }
  });

  it("marks exactly one entry as the current page", () => {
    render("/admin/applications/board");
    const current = rows().filter((el) => el.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain("board");
  });

  it("renders the three unbuilt routes as comments, not links, not focusable", () => {
    render("/admin");
    const soon = rows().filter((el) => el.textContent?.includes("# em breve"));
    expect(soon.map((el) => el.children[2].textContent)).toEqual([
      "replies/  # em breve",
      "posts/  # em breve",
      "experiences/  # em breve",
    ]);
    for (const el of soon) {
      expect(el.tagName).toBe("SPAN");
      expect(el.getAttribute("href")).toBeNull();
      expect(el.getAttribute("tabindex")).toBeNull();
    }
  });

  it("opens on a skip link that is focusable, targets the content and lands on it", () => {
    render("/admin");
    // First tab stop of every /admin route.
    const skip = container.querySelector<HTMLAnchorElement>("a")!;
    expect(skip.getAttribute("href")).toBe("#content");
    expect(accessibleText(skip)).toBe("Ir para o conteúdo");

    // Activating it has to MOVE the focus, not just scroll: in WebKit a
    // fragment link onto a non-focusable element is a no-op and the next Tab
    // walks the 14 tree entries again.
    const main = container.querySelector<HTMLElement>("main#content")!;
    expect(main.tabIndex).toBe(-1);
    main.focus();
    expect(document.activeElement).toBe(main);
  });

  it("keeps the focused skip link above the status bar", () => {
    // jsdom loads no stylesheet, so the stacking order is asserted at the
    // source: `.skip` is absolute at `z-index: 20` and the bar is opaque and
    // full-width over the very corner the link appears in, so a tie would
    // hide the first tab stop of the whole backoffice.
    const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");
    const zOf = (css: string, rule: string) =>
      Number(new RegExp(`\\${rule}\\s*\\{[^}]*z-index:\\s*(\\d+)`).exec(css)?.[1]);

    const chrome = read("./admin-chrome.module.css");
    expect(zOf(read("../../terminal/terminal.module.css"), ".skip")).toBe(20);
    expect(zOf(chrome, ".top")).toBeLessThan(20);
    // …and the frame is the skip link's containing block.
    expect(/\.shell\s*\{[^}]*position:\s*relative/.test(chrome)).toBe(true);
  });

  it("gives the tree, the `cd ..` and the menu toggle an accessible name", () => {
    render("/admin");
    const links = [
      ...container.querySelectorAll<HTMLAnchorElement>("a"),
    ];
    for (const a of links) {
      expect(accessibleText(a) || a.getAttribute("aria-label")).toBeTruthy();
    }
    const toggle = container.querySelector<HTMLButtonElement>(
      "nav[aria-label='Navegação do backoffice'] button",
    )!;
    expect(accessibleText(toggle)).toBe("tree ~/admin");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBe("admin-tree");
  });
});
