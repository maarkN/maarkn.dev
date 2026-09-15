// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import { ThemeProvider } from "@/components/theme-provider";
import { EMPTY_TERMINAL_DATA, type TerminalData } from "@/lib/terminal/types";
import { initialOutput } from "./initial-output";
import { TerminalApp } from "./terminal-app";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

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

function mount(initialLines?: ReturnType<typeof initialOutput>) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <ThemeProvider>
        <TerminalApp
          labels={en.terminal}
          locale="en"
          data={data}
          motd={null}
          initialLines={initialLines}
        />
      </ThemeProvider>,
    );
  });
}

beforeEach(() => {
  push.mockReset();
  window.sessionStorage.clear();
  mount();
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

  describe("ask", () => {
    const ENCODER = new TextEncoder();
    const sse = (event: string, data: unknown) =>
      `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const bodies: { messages: { role: string; content: string }[] }[] = [];
    let release: () => void;

    /** `/api/chat` stand-in: streams `chunks`; the last one waits for `release()`. */
    function fakeChat(chunks: string[]) {
      return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)));
        const signal = init?.signal;
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            for (const [i, delta] of chunks.entries()) {
              if (i === chunks.length - 1) await new Promise<void>((r) => (release = r));
              if (signal?.aborted) {
                const err = new Error("aborted");
                err.name = "AbortError";
                controller.error(err);
                return;
              }
              controller.enqueue(ENCODER.encode(sse("chunk", { delta })));
            }
            controller.enqueue(ENCODER.encode(sse("done", {})));
            controller.close();
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
      });
    }

    const settle = () => act(() => new Promise((r) => setTimeout(r, 60)));

    beforeEach(() => {
      bodies.length = 0;
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("streams the reply with markdown, keeps context and forgets it on clear", async () => {
      vi.stubGlobal("fetch", fakeChat(["I use **TypeScript**", " and Go."]));
      await enter("ask what stack do you use?");
      await settle();
      expect(screenText()).toContain("I use TypeScript");
      expect(container.querySelector("main [class*='_b_']")?.textContent).toBe("TypeScript");
      release();
      await settle();
      expect(screenText()).toContain("I use TypeScript and Go.");

      await enter("ask and Go?");
      await settle();
      expect(bodies[1].messages).toEqual([
        { role: "user", content: "what stack do you use?" },
        { role: "assistant", content: "I use **TypeScript** and Go." },
        { role: "user", content: "and Go?" },
      ]);
      release();
      await settle();

      await enter("clear");
      await enter("ask fresh?");
      await settle();
      expect(bodies[2].messages).toEqual([{ role: "user", content: "fresh?" }]);
      release();
      await settle();
    });

    it("aborts the request on Ctrl+C, prints ^C and keeps the partial text", async () => {
      const fetch = fakeChat(["partial answer", " never arrives"]);
      vi.stubGlobal("fetch", fetch);
      await enter("ask tell me everything");
      await settle();
      expect(screenText()).toContain("partial answer");
      await key("c", { ctrlKey: true });
      const signal = (fetch.mock.calls[0][1] as RequestInit).signal!;
      expect(signal.aborted).toBe(true);
      release();
      await settle();
      const text = screenText();
      expect(text).toContain("partial answer");
      expect(text).not.toContain("never arrives");
      expect(text).toContain("^C");
      expect(container.querySelector("main [class*='askCursor']")).toBeNull();
    });
  });

  describe("with the server-rendered opening output", () => {
    beforeEach(() => {
      act(() => root.unmount());
      container.remove();
      mount(initialOutput({ labels: en.terminal, locale: "en", data }));
    });

    it("adopts whoami + sitemap as the first lines, once, and keeps them above later output", async () => {
      const count = () => (screenText().match(/Marco Filho · maarkn/g) ?? []).length;
      expect(count()).toBe(1);
      const nav = container.querySelector('nav[aria-label="sitemap"]')!;
      expect(nav.querySelector('a[href="/en/projects"]')).not.toBeNull();
      expect(nav.querySelector('a[href="https://github.com/maarkn"]')).not.toBeNull();
      // Already on screen when the HTML arrived: no entrance animation.
      expect(container.querySelector("main [class*='line']")!.className).toMatch(/now/);

      await enter("help");
      expect(count()).toBe(1);
      const text = screenText();
      expect(text.indexOf("# projects")).toBeLessThan(text.indexOf("maarkn@dev:~$ help"));

      await enter("whoami");
      expect(count()).toBe(2);
      await enter("clear");
      expect(count()).toBe(0);
      expect(container.querySelector('nav[aria-label="sitemap"]')).toBeNull();
    });
  });
});
