// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import { ThemeProvider } from "@/components/theme-provider";
import { EMPTY_TERMINAL_DATA, type TerminalData } from "@/lib/terminal/types";
import { TerminalApp } from "./terminal-app";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const data: TerminalData = {
  ...EMPTY_TERMINAL_DATA,
  numbers: { years: "6", products: "20+", stacks: "12", countries: "2" },
  experience: [
    { slug: "acme-lead", period: "2024 — Now", company: "Acme", role: "Lead", summary: "Ran it." },
  ],
  projects: ["alpha", "bravo"].map((slug) => ({
    slug,
    name: slug,
    year: "2025",
    category: "ai",
    status: "live",
    stack: ["TS"],
    tagline: `${slug} does things`,
  })),
  projectLabels: en.projects,
};

let root: Root;
let container: HTMLDivElement;

const input = () => container.querySelector("input")!;
const screenText = () => container.querySelector("main")!.textContent ?? "";

function type(text: string) {
  const el = input();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function key(k: string, init: KeyboardEventInit = {}) {
  await act(async () => {
    input().dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, ...init }));
  });
}

async function enter(text: string) {
  type(text);
  await key("Enter");
}

beforeEach(() => {
  push.mockReset();
  window.sessionStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <ThemeProvider>
        <TerminalApp labels={en.terminal} locale="en" data={data} motd={null} />
      </ThemeProvider>,
    );
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("TerminalApp", () => {
  it("runs experience from the menu shortcut 2 and marks it done", async () => {
    await enter("2");
    expect(screenText()).toContain("experience.log · newest first");
    expect(screenText()).toContain("Lead · Acme");
    const item = container.querySelector('[data-cmd="experience"]')!;
    expect(item.className).toMatch(/done/);
  });

  it("navigates in-app with open <n> after projects", async () => {
    await enter("projects");
    expect(screenText()).toContain("[1]alpha");
    await enter("open 2");
    expect(push).toHaveBeenCalledWith("/en/projects/bravo");
    expect(screenText()).toContain("opening bravo");
    await enter("open 99");
    expect(screenText()).toContain("open: pick a number 1–2 · see projects");
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("completes commands in mockup order and files after cat", async () => {
    type("w");
    await key("Tab");
    expect(screenText()).toContain("whoami  writing  whereami");
    type("cat sk");
    await key("Tab");
    expect(input().value).toBe("cat skills.sys ");
  });

  it("prints the neofetch swatches bound to the palette variables", async () => {
    await enter("neofetch");
    const swatches = [...container.querySelectorAll("main span[style]")].map(
      (el) => (el as HTMLElement).style.background,
    );
    expect(swatches).toEqual(
      ["red", "orange", "yellow", "green", "cyan", "purple", "pink", "fg"].map((c) => `var(--${c})`),
    );
    await enter("theme classic");
    expect(document.documentElement.getAttribute("data-theme")).toBe("classic");
  });
});
