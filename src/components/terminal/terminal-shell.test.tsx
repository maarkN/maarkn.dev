// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import { ThemeProvider } from "@/components/theme-provider";
import { isAbortError } from "@/lib/terminal/abort";
import { createMailCommand, MAIL_SENT_AT_KEY } from "@/lib/terminal/mail-command";
import type { Command } from "@/lib/terminal/types";
import { TerminalShell } from "./terminal-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/en",
  useSearchParams: () => new URLSearchParams(),
}));
// `mail` sends through a server action; the shell tests fake the transport.
vi.mock("@/app/_actions/contact", () => ({ submitContact: vi.fn() }));
const sendMail = vi.fn<(data: FormData) => Promise<{ status: "success" }>>(async () => ({
  status: "success",
}));

const labels = en.terminal;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* Content commands are registered by change 04; a few stubs stand in here so
   the spec scenarios (alias `2`, `w` + Tab, menu done state) can be exercised. */
const stubs: Command[] = [
  { name: "whoami", describe: "who", run: () => ["marco"] },
  { name: "experience", describe: "career", run: () => ["career"] },
  { name: "skills", describe: "stack", run: () => ["stack"] },
  { name: "projects", describe: "work", run: () => ["work"] },
  { name: "writing", describe: "posts", run: () => ["posts"] },
  {
    name: "slow",
    describe: "three delayed lines",
    run: async (_, ctx) => {
      for (const n of [1, 2, 3]) {
        await sleep(20);
        ctx.print(`slow ${n}`);
      }
      return null;
    },
  },
  {
    name: "quiz",
    describe: "two questions through ctx.ask",
    run: async (_, ctx) => {
      try {
        const first = await ctx.ask!("first:", { inputMode: "email", enterKeyHint: "next" });
        const second = await ctx.ask!("second:", { multiline: true, enterKeyHint: "send" });
        return [`got ${first} / ${second.replace(/\n/g, "|")}`];
      } catch (error) {
        if (isAbortError(error)) return ["quiz cancelled"];
        throw error;
      }
    },
  },
  createMailCommand(labels, { send: (data) => sendMail(data) }),
];

let root: Root;
let container: HTMLDivElement;

const input = () => container.querySelector("input")!;
const lines = () => [...container.querySelectorAll("main .line, main [class*='line']")];
const screenText = () => container.querySelector("main")!.textContent ?? "";
const promptText = () => container.querySelector("[class*='prompt']")!.textContent ?? "";

function mount() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <ThemeProvider>
        <TerminalShell labels={labels} locale="en" motd={null} commands={stubs} />
      </ThemeProvider>,
    );
  });
}

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
  window.sessionStorage.clear();
  // The boot sequence has its own tests; here the session is already booted.
  window.sessionStorage.setItem("maarkn-booted", "1");
  mount();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("terminal shell", () => {
  it("echoes the prompt line and runs the command; numeric alias marks the menu item done", async () => {
    await enter("2");
    expect(screenText()).toContain("maarkn@dev:~$ 2");
    expect(screenText()).toContain("career");
    const item = container.querySelector('[data-cmd="experience"]')!;
    expect(item.className).toMatch(/done/);
    expect(input().value).toBe("");
  });

  it("empty Enter only echoes the prompt", async () => {
    await enter("   ");
    const echoed = [...container.querySelectorAll("main div")].filter((d) =>
      d.textContent?.startsWith("maarkn@dev:~$"),
    );
    expect(echoed.length).toBeGreaterThanOrEqual(1);
    expect(screenText()).not.toContain("command not found");
  });

  it("unknown command prints the bash error and nothing else", async () => {
    await enter("foo bar");
    expect(screenText()).toContain("bash: foo: command not found · type help");
  });

  it("renders injected markup literally", async () => {
    await enter("<img src=x onerror=alert(1)>");
    expect(container.querySelector("img")).toBeNull();
    expect(screenText()).toContain("bash: <img: command not found");
    await enter("echo <b>bold</b>");
    expect(container.querySelector("main b")).toBeNull();
    expect(screenText()).toContain("echo <b>bold</b>");
  });

  it("walks history with ↑/↓ and empties the field past the newest entry", async () => {
    await enter("whoami");
    await enter("skills");
    await key("ArrowUp");
    expect(input().value).toBe("skills");
    await key("ArrowUp");
    expect(input().value).toBe("whoami");
    await key("ArrowDown");
    expect(input().value).toBe("skills");
    await key("ArrowDown");
    expect(input().value).toBe("");
    await enter("history");
    expect(screenText()).toMatch(/1 {2}whoami/);
    expect(screenText()).toMatch(/2 {2}skills/);
    expect(screenText()).toMatch(/3 {2}history/);
    expect(JSON.parse(window.sessionStorage.getItem("maarkn-term")!)).toMatchObject({
      history: ["whoami", "skills", "history"],
    });
  });

  it("Tab completes a unique prefix and lists candidates otherwise", async () => {
    type("proj");
    await key("Tab");
    expect(input().value).toBe("projects ");

    type("w");
    await key("Tab");
    expect(input().value).toBe("w");
    expect(screenText()).toContain("maarkn@dev:~$ w");
    expect(screenText()).toContain("whoami  writing  whereami");
  });

  it("Ctrl+L clears the screen", async () => {
    await enter("whoami");
    expect(screenText()).toContain("marco");
    await key("l", { ctrlKey: true });
    expect(screenText()).not.toContain("marco");
  });

  it("Ctrl+C echoes the line with ^C and clears the field; native copy wins with a selection", async () => {
    type("proj");
    await key("c", { ctrlKey: true });
    expect(screenText()).toContain("maarkn@dev:~$ proj^C");
    expect(input().value).toBe("");

    vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "copied" } as Selection);
    type("abc");
    await key("c", { ctrlKey: true });
    expect(input().value).toBe("abc");
  });

  it("streams async output and clear aborts what is still pending", async () => {
    await enter("slow");
    await act(() => sleep(30));
    expect(screenText()).toContain("slow 1");
    await enter("clear");
    await act(() => sleep(80));
    expect(screenText()).not.toContain("slow");
  });

  it("theme and font commands update the status bar", async () => {
    await enter("theme classic");
    expect(screenText()).toContain("theme → classic · dracula classic, the original");
    expect(container.querySelector("header")!.textContent).toContain("classic");
    expect(document.documentElement.getAttribute("data-theme")).toBe("classic");
    await enter("theme");
    expect(screenText()).toContain("theme → soft · dracula soft, the dimmed one");

    await enter("font daddytime");
    expect(screenText()).toContain("font → DaddyTimeMono");
    expect(container.querySelector("header")!.textContent).toContain("daddytime");
    await act(() => sleep(10));
    // jsdom has no FontFaceSet: the probe reports the face as available.
    expect(screenText()).not.toContain("isn't available");
    await enter("font");
    expect(screenText()).toContain("font → Caskaydia Cove / Cascadia Code");
  });

  it("font daddytime warns in orange when the face cannot be loaded", async () => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { load: () => Promise.resolve([]), check: () => false },
    });
    try {
      await enter("font daddytime");
      await act(() => sleep(10));
      expect(screenText()).toContain("DaddyTimeMono isn't available here");
      const warning = [...container.querySelectorAll("main span")].find((el) =>
        el.textContent?.includes("isn't available"),
      )!;
      expect(warning.className).toMatch(/o/);
    } finally {
      delete (document as { fonts?: unknown }).fonts;
    }
  });

  it("help lists the visible commands, the aside and the shortcuts", async () => {
    await enter("help");
    const text = screenText();
    expect(text).toContain("commands");
    expect(text).toContain("clear");
    expect(text).toContain("wipe the screen");
    expect(text).toContain("also try: theme · font · history · uptime · reboot");
    expect(text).toContain("numbers 1–6 are shortcuts");
    expect(text).not.toContain("sudo");
  });

  it("system easter eggs answer like the mockup", async () => {
    await enter("sudo rm -rf /");
    expect(screenText()).toContain("[sudo] password for maarkn: ********");
    expect(screenText()).toContain("maarkn is not in the sudoers file. This incident will be reported.");
    await enter("rm -rf /");
    expect(screenText()).toContain("rm: cannot remove '-rf /': permission denied · nice try");
    await enter("exit");
    expect(screenText()).toContain("…just kidding. there's no exit — try contact");
    await enter("uptime");
    expect(screenText()).toContain("up 6 years, 20+ products shipped, 0 fragile · load average");
    await enter("whereami");
    expect(screenText()).toContain("Goiânia, Brazil · UTC−3 · but shipping worldwide");
    await enter("echo hi there");
    expect(screenText()).toContain("hi there");
    await enter("date");
    expect(screenText()).toContain(String(new Date().getFullYear()));
  });

  it("menu buttons run the command and reboot wipes the screen", async () => {
    await act(async () => {
      (container.querySelector('[data-cmd="whoami"]') as HTMLButtonElement).click();
    });
    expect(screenText()).toContain("marco");
    await enter("reboot");
    expect(screenText()).not.toContain("marco");
  });

  it("stagger delay never exceeds 480ms", async () => {
    await enter("help");
    const delays = lines()
      .map((el) => (el as HTMLElement).style.animationDelay)
      .filter(Boolean)
      .map((d) => parseInt(d, 10));
    expect(delays.length).toBeGreaterThan(0);
    expect(Math.max(...delays)).toBeLessThanOrEqual(480);
  });

  describe("accessibility", () => {
    it("exposes landmarks: header, labelled nav, main, a labelled prompt and a polite live region", () => {
      expect(container.querySelector("header")).not.toBeNull();
      expect(container.querySelector('nav[aria-label="commands"]')).not.toBeNull();
      expect(container.querySelector("main")).not.toBeNull();
      const live = container.querySelector('main [aria-live="polite"]')!;
      expect(live.getAttribute("aria-relevant")).toBe("additions");
      const label = container.querySelector(`label[for="${input().id}"]`)!;
      expect(label.textContent).toBe("command line");
    });

    it("the skip link is the first focusable element and focuses the prompt", async () => {
      const focusables = container.querySelectorAll<HTMLElement>("a[href], button, input");
      const skip = focusables[0];
      expect(skip.tagName).toBe("A");
      expect(skip.textContent).toBe("skip to command line");
      expect(skip.getAttribute("href")).toBe("#cmd");
      await act(async () => skip.click());
      expect(document.activeElement).toBe(input());
    });

    it("groups each command's output in a section named after the resolved command", async () => {
      await enter("2");
      const sections = [...container.querySelectorAll("main section")];
      const last = sections[sections.length - 1];
      expect(last.getAttribute("aria-label")).toBe("output of experience");
      expect(last.textContent).toContain("maarkn@dev:~$ 2");
      expect(last.textContent).toContain("career");
      // The text is in the DOM before any animation finishes.
      expect(lines().every((el) => (el.textContent ?? "").length > 0)).toBe(true);
    });

    it("an unknown command still gets its own section, named after what was typed", async () => {
      await enter("nope");
      const sections = [...container.querySelectorAll("main section")];
      expect(sections[sections.length - 1].getAttribute("aria-label")).toBe("output of nope");
    });

    it("Tab on an empty prompt wraps the focus to the skip link instead of listing every command", async () => {
      act(() => input().focus());
      await key("Tab");
      expect(document.activeElement?.textContent).toBe("skip to command line");
      expect(screenText()).not.toContain("whoami  experience");
      type("w");
      await key("Tab");
      expect(input().value).toBe("w");
      expect(screenText()).toContain("whoami  writing  whereami");
    });

    it("Esc discards a typed line and, on an empty prompt, moves focus to the first menu item", async () => {
      type("whoa");
      await key("Escape");
      expect(input().value).toBe("");
      expect(document.activeElement).not.toBe(input());
      act(() => input().focus());
      await key("Escape");
      expect(document.activeElement).toBe(container.querySelector('[data-cmd="whoami"]'));
    });

    it("focus stays on the prompt after a command", async () => {
      act(() => input().focus());
      await enter("whoami");
      expect(document.activeElement).toBe(input());
    });

    it("help mentions Esc and names commands as English code", async () => {
      await enter("help");
      expect(screenText()).toContain("esc leaves the prompt");
      const code = container.querySelector('main code[lang="en"]')!;
      expect(code).not.toBeNull();
      expect(code.textContent).toBe("whoami");
    });
  });

  describe("interactive prompt (ctx.ask)", () => {
    it("swaps the PS1 for the question, answers on Enter and keeps answers out of history", async () => {
      await enter("quiz");
      expect(promptText()).toContain("→ first:");
      expect(promptText()).not.toContain("maarkn@dev");
      expect(input().getAttribute("inputmode")).toBe("email");
      expect(input().getAttribute("enterkeyhint")).toBe("next");

      await enter("alpha");
      expect(screenText()).toContain("→ first: alpha");
      expect(promptText()).toContain("→ second:");
      expect(input().getAttribute("inputmode")).toBe("text");
      expect(input().getAttribute("enterkeyhint")).toBe("send");

      await enter("beta");
      expect(screenText()).toContain("→ second: beta");
      expect(screenText()).toContain("got alpha / beta");
      expect(promptText()).toContain("maarkn@dev:~$");
      expect(input().getAttribute("enterkeyhint")).toBe("go");

      await key("ArrowUp");
      expect(input().value).toBe("quiz");
      await key("ArrowUp");
      expect(input().value).toBe("quiz");
      // Neither history nor the replayable session log keeps the answers.
      expect(JSON.parse(window.sessionStorage.getItem("maarkn-term")!)).toEqual({
        history: ["quiz"],
        lastCommands: ["quiz"],
      });
    });

    it("ignores history and autocomplete while a question is pending", async () => {
      await enter("whoami");
      await enter("quiz");
      await key("ArrowUp");
      expect(input().value).toBe("");
      type("who");
      await key("Tab");
      expect(input().value).toBe("who");
      expect(screenText()).not.toContain("whoami  writing");
    });

    it("Esc cancels the question and restores the prompt", async () => {
      await enter("quiz");
      type("half an answer");
      await key("Escape");
      expect(screenText()).toContain("quiz cancelled");
      expect(screenText()).not.toContain("half an answer");
      expect(promptText()).toContain("maarkn@dev:~$");
      expect(input().value).toBe("");
    });

    it("Ctrl+C cancels the question; native copy wins with a selection", async () => {
      await enter("quiz");
      vi.spyOn(window, "getSelection").mockReturnValueOnce({ toString: () => "copied" } as Selection);
      await key("c", { ctrlKey: true });
      expect(promptText()).toContain("→ first:");
      await key("c", { ctrlKey: true });
      expect(screenText()).toContain("quiz cancelled");
      expect(promptText()).toContain("maarkn@dev:~$");
    });

    it("Shift+Enter adds a continuation line to a multiline answer", async () => {
      await enter("quiz");
      await enter("a");
      type("line one");
      await key("Enter", { shiftKey: true });
      expect(screenText()).toContain("→ second: line one");
      expect(promptText()).toMatch(/^… /);
      expect(input().value).toBe("");
      await enter("line two");
      expect(screenText()).toContain("… line two");
      expect(screenText()).toContain("got a / line one|line two");
    });

    it("mail: the whole flow runs in the prompt, answers stay out of history, 60s cooldown", async () => {
      sendMail.mockClear();
      await enter("mail");
      // The field schemas (zod) are loaded on demand before the first question.
      await act(() => sleep(20));
      expect(promptText()).toContain("→ name:");
      expect(screenText()).toContain("enter answers · esc cancels");
      await enter("Jane Doe");
      expect(input().getAttribute("inputmode")).toBe("email");
      await enter("jane@");
      expect(screenText()).toContain("not a valid address, try again · 2 left");
      expect(promptText()).toContain("→ email:");
      await enter("jane@acme.com");
      await enter("");
      expect(promptText()).toContain("→ message:");
      expect(screenText()).toContain("shift+enter adds a line");
      type("We're hiring a senior");
      await key("Enter", { shiftKey: true });
      expect(promptText()).toMatch(/^… /);
      await enter("AI engineer in Berlin.");
      expect(promptText()).toContain("→ send? [Y/n]");
      expect(input().getAttribute("enterkeyhint")).toBe("send");
      await enter("y");
      await act(() => sleep(10));

      expect(sendMail).toHaveBeenCalledTimes(1);
      const data = sendMail.mock.calls[0]![0];
      expect(data.get("message")).toBe("We're hiring a senior\nAI engineer in Berlin.");
      expect(data.get("source")).toBe("terminal");
      expect(screenText()).toContain("✓ sent · I read every message");
      expect(promptText()).toContain("maarkn@dev:~$");
      expect(screenText()).toContain("tab autocomplete · ↑ history");

      await key("ArrowUp");
      expect(input().value).toBe("mail");
      await key("ArrowUp");
      expect(input().value).toBe("mail");
      expect(JSON.parse(window.sessionStorage.getItem("maarkn-term")!)).toEqual({
        history: ["mail"],
      });
      expect(window.sessionStorage.getItem(MAIL_SENT_AT_KEY)).toMatch(/^\d+$/);

      type("");
      await enter("mail");
      expect(screenText()).toMatch(/wait (60|59)s before sending another message/);
      expect(promptText()).toContain("maarkn@dev:~$");
    });

    it("mail: Esc cancels with ^C · mail cancelled and nothing is sent", async () => {
      sendMail.mockClear();
      await enter("mail");
      await enter("Jane Doe");
      await enter("jane@acme.com");
      await enter("Acme");
      type("half a message");
      await key("Escape");
      expect(screenText()).toContain("^C · mail cancelled");
      expect(screenText()).not.toContain("half a message");
      expect(promptText()).toContain("maarkn@dev:~$");
      expect(sendMail).not.toHaveBeenCalled();
    });

    it("Ctrl+L wipes the screen and drops the pending question", async () => {
      await enter("quiz");
      await key("l", { ctrlKey: true });
      expect(screenText()).not.toContain("quiz");
      expect(promptText()).toContain("maarkn@dev:~$");
    });

    it("a new command from the menu aborts the pending question", async () => {
      await enter("quiz");
      await act(async () => {
        (container.querySelector('[data-cmd="whoami"]') as HTMLButtonElement).click();
      });
      expect(screenText()).toContain("marco");
      expect(promptText()).toContain("maarkn@dev:~$");
    });
  });
});
