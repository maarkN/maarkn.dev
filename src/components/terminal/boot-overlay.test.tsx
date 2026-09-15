// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import ptBR from "@/dictionaries/pt-BR.json";
import { ThemeProvider } from "@/components/theme-provider";
import type { Command } from "@/lib/terminal/types";
import { BOOT_KEY } from "./boot-overlay";
import { TerminalShell } from "./terminal-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/en",
  useSearchParams: () => new URLSearchParams(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const labels = en.terminal;
const stubs: Command[] = [{ name: "whoami", describe: "who", run: () => ["marco"] }];

let root: Root;
let container: HTMLDivElement;

const overlay = () => container.querySelector<HTMLElement>("[data-boot]");
const bootLines = () => [...container.querySelectorAll("[data-boot] pre div")];
const shell = () => container.querySelector<HTMLElement>("header")!.parentElement!;
const input = () => container.querySelector("input")!;
const screenText = () => container.querySelector("main")!.textContent ?? "";
const booted = () => window.sessionStorage.getItem(BOOT_KEY);

/** `matchMedia` is missing in jsdom; answer the two queries the shell asks. */
function media({ reduce = false, fine = false } = {}) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes("reduced-motion") ? reduce : query.includes("pointer") ? fine : false,
    media: query,
  })) as unknown as typeof window.matchMedia;
}

function mount(dict = labels) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <ThemeProvider>
        <TerminalShell labels={dict} locale="en" motd={<p>motd here</p>} commands={stubs} />
      </ThemeProvider>,
    );
  });
}

const tick = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

function type(text: string) {
  const el = input();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function enter(text: string) {
  type(text);
  await act(async () => {
    input().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  // Deterministic per-character delay: the middle of the jitter range.
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  window.sessionStorage.clear();
  media();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("boot sequence", () => {
  it("first visit: types the six lines over 3–5s, paints [ok] green, then lifts the overlay", async () => {
    mount();
    expect(overlay()).not.toBeNull();
    expect(shell().hasAttribute("inert")).toBe(true);
    expect(shell().getAttribute("aria-hidden")).toBe("true");
    // The shell is in the DOM underneath from the start.
    expect(screenText()).toContain("motd here");
    expect(screenText()).toContain("maarkn@dev");

    await tick(100);
    expect(bootLines().length).toBe(1);
    expect(bootLines()[0].textContent!.length).toBeGreaterThan(0);
    expect(bootLines()[0].textContent!.length).toBeLessThan(labels.boot.lines[0].length);

    await tick(2900);
    expect(booted()).toBeNull();
    expect(overlay()!.className).not.toMatch(/Gone/);

    await tick(2000);
    expect(booted()).toBe("1");
    expect(bootLines().map((el) => el.textContent)).toEqual(labels.boot.lines);
    const oks = [...container.querySelectorAll("[data-boot] span")].filter(
      (el) => el.textContent === "[ok]",
    );
    expect(oks.length).toBe(2);
    // CSS-module name of `.g` (green), whatever the hashing strategy.
    expect(oks.every((el) => /(^|[\s_])g(_|$)/.test(el.className))).toBe(true);
    expect(overlay()!.className).toMatch(/Gone/);
    expect(shell().hasAttribute("inert")).toBe(false);

    await tick(600);
    expect(overlay()).toBeNull();
  });

  it("announces one sentence to assistive tech and hides the typed lines from it", async () => {
    mount();
    await tick(100);
    const status = container.querySelector('[role="status"]')!;
    expect(status.textContent).toBe(labels.boot.status);
    expect(status.closest("[aria-hidden]")).toBeNull();
    expect(status.className).toContain("sr-only");
    expect(container.querySelector("[data-boot] pre")!.getAttribute("aria-hidden")).toBe("true");
    expect(overlay()!.hasAttribute("aria-live")).toBe(false);
    expect(container.querySelectorAll('[role="status"]').length).toBe(1);

    await tick(5000);
    await tick(600);
    expect(overlay()).toBeNull();
    expect(container.querySelector('[role="status"]')).toBe(status);
    expect(status.textContent).toBe("");
  });

  it("reboot writes the sentence into the same live region again", async () => {
    window.sessionStorage.setItem(BOOT_KEY, "1");
    mount();
    await tick(10);
    const status = container.querySelector('[role="status"]')!;
    expect(status.textContent).toBe("");

    await enter("reboot");
    expect(overlay()).not.toBeNull();
    // Same node (not a remount with the text already inside), text added.
    expect(container.querySelector('[role="status"]')).toBe(status);
    expect(status.textContent).toBe(labels.boot.status);
    expect(status.closest("[aria-hidden]")).toBeNull();
  });

  it("also boots in pt-BR within the budget", async () => {
    mount(ptBR.terminal);
    await tick(3000);
    expect(booted()).toBeNull();
    await tick(2000);
    expect(booted()).toBe("1");
    expect(bootLines().map((el) => el.textContent)).toEqual(ptBR.terminal.boot.lines);
  });

  it("a tap during the second line prints everything and shows the terminal in < 500ms", async () => {
    mount();
    await tick(650);
    expect(bootLines().length).toBe(2);
    expect(bootLines()[1].textContent!.length).toBeLessThan(labels.boot.lines[1].length);

    await act(async () => {
      window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(bootLines().map((el) => el.textContent)).toEqual(labels.boot.lines);

    await tick(400);
    expect(booted()).toBe("1");
    expect(overlay()!.className).toMatch(/Gone/);
    expect(shell().hasAttribute("inert")).toBe(false);
  });

  it("a key skips too, but a modifier on its own does not", async () => {
    mount();
    await tick(150);
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }));
    });
    await tick(50);
    expect(bootLines().length).toBe(1);
    expect(bootLines()[0].textContent!.length).toBeLessThan(labels.boot.lines[0].length);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    });
    expect(bootLines().map((el) => el.textContent)).toEqual(labels.boot.lines);
  });

  it("prefers-reduced-motion: no overlay, no typing, session marked as booted", async () => {
    media({ reduce: true });
    mount();
    await tick(10);
    expect(overlay()).toBeNull();
    expect(booted()).toBe("1");
    expect(shell().hasAttribute("inert")).toBe(false);
    await enter("reboot");
    await tick(10);
    expect(overlay()).toBeNull();
  });

  it("an already booted session shows the terminal directly", async () => {
    window.sessionStorage.setItem(BOOT_KEY, "1");
    mount();
    await tick(10);
    expect(overlay()).toBeNull();
    expect(shell().hasAttribute("inert")).toBe(false);
  });

  it("reboot wipes the output, clears the flag and runs the boot again", async () => {
    window.sessionStorage.setItem(BOOT_KEY, "1");
    mount();
    await tick(10);
    await enter("whoami");
    expect(screenText()).toContain("marco");

    await enter("reboot");
    expect(screenText()).not.toContain("marco");
    expect(booted()).toBeNull();
    expect(overlay()).not.toBeNull();
    expect(shell().hasAttribute("inert")).toBe(true);

    // The Enter that ran `reboot` is still bubbling when the overlay mounts:
    // it must not count as the "any key" that skips the sequence.
    await tick(100);
    expect(bootLines().length).toBe(1);
    expect(bootLines()[0].textContent!.length).toBeLessThan(labels.boot.lines[0].length);
    expect(shell().hasAttribute("inert")).toBe(true);

    await tick(5000);
    expect(booted()).toBe("1");
    expect(bootLines().map((el) => el.textContent)).toEqual(labels.boot.lines);
    await tick(600);
    expect(overlay()).toBeNull();
  });

  it("focuses the prompt after the boot on a fine-pointer device only", async () => {
    media({ fine: true });
    mount();
    await tick(10);
    expect(document.activeElement).not.toBe(input());
    await tick(5000);
    expect(document.activeElement).toBe(input());
    act(() => root.unmount());
    container.remove();

    media({ fine: false });
    mount();
    await tick(5000);
    expect(document.activeElement).not.toBe(input());
  });
});
