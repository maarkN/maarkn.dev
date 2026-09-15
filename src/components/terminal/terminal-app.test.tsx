// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import { ThemeProvider } from "@/components/theme-provider";
import { EMPTY_TERMINAL_DATA, type TerminalData } from "@/lib/terminal/types";
import { initialOutput } from "./initial-output";
import { TerminalApp } from "./terminal-app";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const push = vi.fn();
/** What `useSearchParams` reports; tests set it before mounting. */
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/en",
  useSearchParams: () => new URLSearchParams(search),
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
/** Printed lines only — the prompt (with whatever is typed) is not output. */
const outputText = () =>
  [...container.querySelectorAll("main [class*='line']")].map((el) => el.textContent).join("\n");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Lets the mount-time replay (deferred a microtask) and async commands settle. */
const settle = () => act(() => sleep(20));

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
  // The boot sequence has its own tests; here the session is already booted.
  window.sessionStorage.setItem("maarkn-booted", "1");
  mount();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  search = "";
  window.history.replaceState(null, "", "/");
});

/** Unmounts and mounts again, like coming back from an inner page. */
function remount(initialLines?: ReturnType<typeof initialOutput>) {
  act(() => root.unmount());
  container.remove();
  mount(initialLines);
}

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

  describe("navigation commands", () => {
    it("cd opens inner routes, refuses unknown ones and pwd knows the home", async () => {
      await enter("cd blog");
      expect(push).toHaveBeenCalledWith("/en/blog");
      expect(screenText()).toContain("opening ~/blog");
      await enter("cd ~/projects/");
      expect(push).toHaveBeenCalledWith("/en/projects");
      await enter("cd career");
      expect(push).toHaveBeenCalledWith("/en/career");
      await enter("cd links");
      expect(push).toHaveBeenCalledWith("/en/links");
      await enter("cd nada");
      expect(screenText()).toContain("cd: nada: no such directory");
      await enter("cd ..");
      expect(screenText()).toContain("cd: already at ~");
      expect(push).toHaveBeenCalledTimes(4);
    });

    it("cd and cd ~ go home only when somewhere else", async () => {
      const pushState = vi.spyOn(window.history, "pushState");
      window.history.replaceState(null, "", "/en");
      await enter("cd");
      expect(push).not.toHaveBeenCalled();
      expect(pushState).not.toHaveBeenCalled();
      // Same page, only the query string goes: the router-integrated History
      // API, not `router.push` (which would resolve back to `?cmd=skills`).
      window.history.replaceState(null, "", "/en?cmd=skills");
      await enter("cd ~");
      expect(pushState).toHaveBeenCalledWith(null, "", "/en");
      expect(window.location.pathname + window.location.search).toBe("/en");
      expect(push).not.toHaveBeenCalled();
      pushState.mockRestore();
    });

    it("pwd prints the home directory and Tab completes directories after cd", async () => {
      await enter("pwd");
      expect(screenText()).toContain("/home/maarkn");
      type("cd pr");
      await key("Tab");
      expect(input().value).toBe("cd projects ");
    });

    it("lang remembers the cookie and moves to the same screen in the other locale", async () => {
      window.history.replaceState(null, "", "/en?cmd=skills");
      await enter("lang pt");
      expect(document.cookie).toContain("locale=pt-BR");
      expect(push).toHaveBeenCalledWith("/pt-BR?cmd=skills");
      expect(screenText()).toContain("lang → pt-BR");

      await enter("lang");
      expect(push).toHaveBeenLastCalledWith("/pt-BR?cmd=skills");
      expect(push).toHaveBeenCalledTimes(2);

      await enter("lang en");
      expect(document.cookie).toContain("locale=en");
      expect(push).toHaveBeenCalledTimes(2);
      expect(screenText()).toContain("lang → en");

      await enter("lang xx");
      expect(screenText()).toContain("lang: xx: unknown language · try lang en or lang pt");
    });

    it("the status bar lang control runs the command and shows the current language", async () => {
      const button = [...container.querySelectorAll("header button")].find((b) =>
        b.textContent?.startsWith("lang"),
      ) as HTMLButtonElement;
      expect(button.textContent).toBe("lang en");
      await act(async () => button.click());
      expect(screenText()).toContain("maarkn@dev:~$ lang");
      expect(push).toHaveBeenCalledWith("/pt-BR");
    });

    it("marks the last content command as current in the menu", async () => {
      const current = () => container.querySelector("[aria-current]")?.getAttribute("data-cmd");
      expect(current()).toBeUndefined();
      await enter("projects");
      expect(current()).toBe("projects");
      await enter("skills");
      expect(current()).toBe("skills");
      await enter("help");
      expect(current()).toBeUndefined();
      await enter("2");
      expect(current()).toBe("experience");
      await enter("clear");
      expect(current()).toBeUndefined();
    });
  });

  describe("deep-links", () => {
    it("?cmd=projects opens with the listing already printed, without animation", async () => {
      search = "cmd=projects";
      remount();
      await settle();
      expect(screenText()).toContain("maarkn@dev:~$ projects");
      expect(screenText()).toContain("[1]alpha");
      const printed = [...container.querySelectorAll("main [class*='line']")];
      expect(printed.length).toBeGreaterThan(1);
      expect(printed.every((el) => /now/.test(el.className))).toBe(true);
      // Recorded like a typed command: ↑ brings it back…
      await key("ArrowUp");
      expect(input().value).toBe("projects");
      // …and open <n> resolves against the list it printed.
      type("");
      await enter("open 1");
      expect(push).toHaveBeenCalledWith("/en/projects/alpha");
    });

    it("?cmd=whoami;skills runs both, in order", async () => {
      search = "cmd=whoami;skills";
      remount();
      await settle();
      const text = screenText();
      expect(text.indexOf("maarkn@dev:~$ whoami")).toBeLessThan(text.indexOf("maarkn@dev:~$ skills"));
      expect(text).toContain("Marco Filho · maarkn");
      expect(text).toContain("skills.sys");
    });

    it("?cmd=<script> and unknown names are ignored silently", async () => {
      search = "cmd=%3Cscript%3E";
      remount();
      await settle();
      expect(screenText()).not.toContain("maarkn@dev:~$ <");
      expect(screenText()).not.toContain("command not found");
      search = "cmd=nope;rm -rf /";
      remount();
      await settle();
      expect(screenText()).not.toContain("maarkn@dev:~$ nope");
      expect(screenText()).not.toContain("rm:");
    });

    it("?cmd=rm+-rf prints the joke, ?cmd=ask only types ask into the prompt", async () => {
      search = "cmd=rm+-rf";
      remount();
      await settle();
      expect(screenText()).toContain("rm: cannot remove '-rf': permission denied");
      search = "cmd=ask";
      remount();
      await settle();
      expect(input().value).toBe("ask ");
      expect(outputText()).not.toContain("maarkn@dev:~$ ask");
    });

    it("runs a deep-link once per value, not again after clear + a re-render", async () => {
      search = "cmd=projects";
      remount();
      await settle();
      await enter("clear");
      await enter("theme classic");
      await settle();
      expect(outputText()).not.toContain("[1]alpha");
      await enter("theme soft");
    });

    it("an old #contact anchor becomes ?cmd=contact in place", async () => {
      window.history.replaceState(null, "", "/en#contact");
      remount();
      await settle();
      expect(window.location.hash).toBe("");
      expect(window.location.search).toBe("?cmd=contact");
      expect(window.location.pathname).toBe("/en");

      window.history.replaceState(null, "", "/en?cmd=skills#about");
      remount();
      await settle();
      expect(window.location.search).toBe("?cmd=skills");
      window.history.replaceState(null, "", "/en#team");
      remount();
      await settle();
      expect(window.location.hash).toBe("#team");

      // A fragment change on the already mounted page converts too.
      window.history.replaceState(null, "", "/en");
      await act(async () => {
        window.location.hash = "#projects";
      });
      await settle();
      expect(window.location.hash).toBe("");
      expect(window.location.search).toBe("?cmd=projects");
    });
  });

  describe("state across pages", () => {
    it("rebuilds the screen and the history after a navigation", async () => {
      await enter("whoami");
      await enter("projects");
      await enter("open 1");
      expect(push).toHaveBeenCalledTimes(1);

      remount();
      expect(screenText()).not.toContain("[1]alpha");
      await settle();
      const text = screenText();
      expect(text).toContain("maarkn@dev:~$ whoami");
      expect(text).toContain("Marco Filho · maarkn");
      expect(text.indexOf("maarkn@dev:~$ whoami")).toBeLessThan(text.indexOf("maarkn@dev:~$ projects"));
      expect(text).toContain("[1]alpha");
      // `open 1` navigated: it is not replayed, but the history keeps it.
      expect(text).not.toContain("maarkn@dev:~$ open 1");
      expect(push).toHaveBeenCalledTimes(1);
      await key("ArrowUp");
      expect(input().value).toBe("open 1");
      await key("ArrowUp");
      expect(input().value).toBe("projects");
      // Rebuilt without the entrance animation, and the menu reflects it.
      const printed = [...container.querySelectorAll("main [class*='line']")];
      expect(printed.every((el) => /now/.test(el.className))).toBe(true);
      expect(container.querySelector('[data-cmd="projects"]')!.className).toMatch(/done/);
      expect(container.querySelector("[aria-current]")?.getAttribute("data-cmd")).toBe("projects");
      // And `open` still resolves against the rebuilt list.
      type("");
      await enter("open 2");
      expect(push).toHaveBeenLastCalledWith("/en/projects/bravo");
    });

    it("keeps at most ten commands", async () => {
      for (let i = 0; i < 12; i++) await enter(`echo line ${i}`);
      remount();
      await settle();
      expect(screenText()).not.toContain("line 1\n");
      expect(screenText()).not.toContain("maarkn@dev:~$ echo line 1line");
      expect(screenText()).toContain("maarkn@dev:~$ echo line 2");
      expect(screenText()).toContain("maarkn@dev:~$ echo line 11");
      expect(JSON.parse(window.sessionStorage.getItem("maarkn-term")!).lastCommands).toHaveLength(10);
    });

    it("clear discards the saved screen; a reload after it starts blank", async () => {
      await enter("whoami");
      await enter("clear");
      expect(JSON.parse(window.sessionStorage.getItem("maarkn-term")!).lastCommands).toEqual([]);
      remount();
      await settle();
      expect(screenText()).not.toContain("maarkn@dev:~$ whoami");
      expect(screenText()).not.toContain("Marco Filho");
      // The history survives, as in any shell.
      await key("ArrowUp");
      expect(input().value).toBe("clear");
    });

    it("does not print a deep-link twice when the rebuilt screen already ends with it", async () => {
      search = "cmd=projects";
      remount();
      await settle();
      await enter("open 1");
      remount();
      await settle();
      expect((screenText().match(/maarkn@dev:~\$ projects/g) ?? []).length).toBe(1);

      // A listing the visitor printed, then `cd ..` from the inner page.
      search = "";
      remount();
      await settle();
      await enter("clear");
      await enter("whoami");
      await enter("projects");
      search = "cmd=projects";
      remount();
      await settle();
      expect((screenText().match(/maarkn@dev:~\$ projects/g) ?? []).length).toBe(1);
      expect(screenText()).toContain("maarkn@dev:~$ whoami");
    });

    it("remembers a skipped deep-link so the back button does not run it either", async () => {
      // `projects`, `cd projects`, then `cd ..` from the inner page: the link
      // is skipped because the rebuilt screen ends with the listing…
      await enter("projects");
      await enter("cd projects");
      expect(push).toHaveBeenLastCalledWith("/en/projects");
      search = "cmd=projects";
      remount();
      await settle();
      expect((screenText().match(/maarkn@dev:~\$ projects/g) ?? []).length).toBe(1);
      expect(JSON.parse(window.sessionStorage.getItem("maarkn-term")!).cmd).toBe("projects");

      // …and the back button after `whoami` + `open 1` lands on that same
      // `/en?cmd=projects` entry: the screen is rebuilt, the link not re-run.
      await enter("whoami");
      await enter("open 1");
      remount();
      await settle();
      const text = screenText();
      expect((text.match(/maarkn@dev:~\$ projects/g) ?? []).length).toBe(1);
      expect(text).toContain("maarkn@dev:~$ whoami");
      expect(text.indexOf("maarkn@dev:~$ projects")).toBeLessThan(text.indexOf("maarkn@dev:~$ whoami"));
      expect(text).not.toContain("maarkn@dev:~$ open 1");
    });
  });
});
