// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import { ThemeProvider } from "@/components/theme-provider";
import type { Command } from "@/lib/terminal/types";
import { TerminalShell } from "./terminal-shell";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

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
];

let root: Root;
let container: HTMLDivElement;

const input = () => container.querySelector("input")!;
const lines = () => [...container.querySelectorAll("main .line, main [class*='line']")];
const screenText = () => container.querySelector("main")!.textContent ?? "";

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
    expect(JSON.parse(window.sessionStorage.getItem("maarkn-term")!)).toEqual({
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
});
