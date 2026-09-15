import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ContactState } from "@/app/_actions/contact";
import en from "@/dictionaries/en.json";
import pt from "@/dictionaries/pt-BR.json";
import { site } from "@/lib/site";
import { abortError } from "./abort";
import {
  createMailCommand,
  MAIL_COOLDOWN_MS,
  MAIL_SENT_AT_KEY,
  type MailDeps,
} from "./mail-command";
import {
  EMPTY_TERMINAL_DATA as data,
  type AskOptions,
  type CommandContext,
  type CommandResult,
} from "./types";

// `submitContact` is a server action; the tests inject a transport instead.
vi.mock("@/app/_actions/contact", () => ({ submitContact: vi.fn() }));

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#x27": "'" };
const text = (node: unknown) =>
  renderToStaticMarkup(<>{node as never}</>)
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#x27);/g, (_, name: string) => ENTITIES[name]!);

/** In-memory `sessionStorage`. */
function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

type Harness = {
  /** Every printed line, in order (`replaceLast` swaps the last one). */
  lines: string[];
  asked: { label: string; options: AskOptions }[];
  send: ReturnType<typeof vi.fn>;
  storage: ReturnType<typeof memoryStorage>;
  run: () => Promise<string[]>;
};

/**
 * Runs `mail` against scripted answers. An answer that is an `Error` is
 * thrown by `ask` instead (the visitor pressed Esc).
 */
function harness(
  answers: (string | Error)[],
  {
    dict = en.terminal,
    result = { status: "success" } as ContactState,
    storage = memoryStorage(),
    at = 1_000_000,
    ask = true,
    ...deps
  }: Omit<MailDeps, "now" | "storage"> & {
    dict?: typeof en.terminal;
    result?: ContactState | Error;
    storage?: ReturnType<typeof memoryStorage>;
    /** What `Date.now()` returns for the command. */
    at?: number;
    ask?: boolean;
  } = {},
): Harness {
  const queue = [...answers];
  const lines: string[] = [];
  const asked: Harness["asked"] = [];
  const send = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  const command = createMailCommand(dict, { send, storage, now: () => at, ...deps });
  const ctx: CommandContext = {
    locale: "en",
    dict,
    data,
    theme: {
      theme: "soft",
      font: "caskaydia",
      setTheme: vi.fn(),
      setFont: vi.fn(),
      toggleTheme: () => "classic",
      toggleFont: () => "daddytime",
    },
    navigate: vi.fn(),
    openExternal: vi.fn(),
    history: ["mail"],
    commands: [command],
    clear: vi.fn(),
    reboot: vi.fn(),
    print: (line) => void lines.push(text(line)),
    replaceLast: (line) => void lines.splice(-1, 1, text(line)),
    signal: new AbortController().signal,
    state: {},
    ask: ask
      ? async (label, options = {}) => {
          asked.push({ label, options });
          const next = queue.shift();
          if (next === undefined) throw new Error(`no scripted answer for "${label}"`);
          if (next instanceof Error) throw next;
          return next;
        }
      : undefined,
  };
  const run = async () => {
    const out: CommandResult = await command.run([], ctx);
    for (const line of out ?? []) lines.push(text(line));
    return lines;
  };
  return { lines, asked, send, storage, run };
}

const HAPPY = ["Jane Doe", "jane@acme.com", "Acme", "We're hiring a senior AI engineer.", "y"];

describe("mail: the interview", () => {
  it("asks name, email, company, message and confirmation, then sends and confirms", async () => {
    const h = harness(HAPPY);
    const out = await h.run();
    expect(h.asked.map((a) => a.label)).toEqual([
      "name:",
      "email:",
      "company (optional):",
      "message:",
      "send? [Y/n]",
    ]);
    expect(h.send).toHaveBeenCalledTimes(1);
    const data = h.send.mock.calls[0]![0] as FormData;
    expect(Object.fromEntries(data.entries())).toEqual({
      name: "Jane Doe",
      email: "jane@acme.com",
      company: "Acme",
      message: "We're hiring a senior AI engineer.",
      source: "terminal",
    });
    expect(out).toEqual([
      "✓ sent · I read every message and reply within a couple of working days.",
    ]);
    expect(h.storage.getItem(MAIL_SENT_AT_KEY)).toBe("1000000");
  });

  it("uses mobile hints: email keyboard, next/send keys, multiline message with its hint", async () => {
    const h = harness(HAPPY);
    await h.run();
    expect(h.asked[0]!.options).toEqual({ enterKeyHint: "next" });
    expect(h.asked[1]!.options).toEqual({ enterKeyHint: "next", inputMode: "email" });
    expect(h.asked[3]!.options).toEqual({
      enterKeyHint: "next",
      multiline: true,
      hint: "shift+enter adds a line · enter continues · esc cancels",
    });
    expect(h.asked[4]!.options).toEqual({ enterKeyHint: "send" });
  });

  it("empty confirmation means yes; trims and accepts an empty company", async () => {
    const h = harness(["  Jane ", "jane@acme.com", "", "Long enough message.", ""]);
    await h.run();
    const data = h.send.mock.calls[0]![0] as FormData;
    expect(data.get("name")).toBe("Jane");
    expect(data.get("company")).toBe("");
  });

  it("n at the confirmation sends nothing", async () => {
    const h = harness(["Jane Doe", "jane@acme.com", "", "Long enough message.", "no"]);
    expect(await h.run()).toEqual(["not sent"]);
    expect(h.send).not.toHaveBeenCalled();
    expect(h.storage.getItem(MAIL_SENT_AT_KEY)).toBeNull();
  });
});

describe("mail: validation", () => {
  it("refuses an invalid email with guidance and asks again", async () => {
    const h = harness(["Jane Doe", "jane@", "jane@acme.com", "", "Long enough message.", "y"]);
    const out = await h.run();
    expect(h.asked.filter((a) => a.label === "email:")).toHaveLength(2);
    expect(out[0]).toBe("not a valid address, try again · 2 left");
    expect(out.at(-1)).toMatch(/^✓ sent/);
  });

  it("refuses a short message and a short name", async () => {
    const h = harness(["J", "Jane", "jane@acme.com", "", "short", "Long enough message.", "y"]);
    const out = await h.run();
    expect(out[0]).toBe("name needs 2–80 characters · 2 left");
    expect(out[1]).toBe("a bit more, please — at least 10 characters (4000 max) · 2 left");
    expect(h.send).toHaveBeenCalledTimes(1);
  });

  it("cancels after three invalid answers on the same field", async () => {
    const h = harness(["Jane Doe", "a@", "b@", "c@"]);
    const out = await h.run();
    expect(h.asked.filter((a) => a.label === "email:")).toHaveLength(3);
    expect(out).toEqual([
      "not a valid address, try again · 2 left",
      "not a valid address, try again · 1 left",
      "too many invalid attempts · mail cancelled",
    ]);
    expect(h.send).not.toHaveBeenCalled();
  });

  it("an unclear confirmation counts as an attempt", async () => {
    const h = harness(["Jane Doe", "jane@acme.com", "", "Long enough message.", "maybe", "y"]);
    const out = await h.run();
    expect(out[0]).toBe("answer y or n · 2 left");
    expect(h.send).toHaveBeenCalledTimes(1);
  });
});

describe("mail: cancel, failure and limits", () => {
  it("Esc/Ctrl+C at any step prints ^C · mail cancelled and sends nothing", async () => {
    const h = harness(["Jane Doe", "jane@acme.com", "", abortError()]);
    expect(await h.run()).toEqual(["^C · mail cancelled"]);
    expect(h.send).not.toHaveBeenCalled();
  });

  it("shows sending… then the failure with the direct address when the action fails", async () => {
    const h = harness(HAPPY);
    const seen: string[] = [];
    h.send.mockImplementation(async () => {
      seen.push(...h.lines);
      return { status: "error", errors: {}, message: "send_failed" };
    });
    const out = await h.run();
    expect(seen).toEqual(["sending…"]);
    expect(out).toEqual([`✗ could not send · email me directly at ${site.email}`]);
    expect(h.storage.getItem(MAIL_SENT_AT_KEY)).toBeNull();
  });

  it("a network error is a failure too, not a crash", async () => {
    const h = harness(HAPPY, { result: new Error("fetch failed") });
    const out = await h.run();
    expect(out[0]).toContain("✗ could not send");
  });

  it("refuses a second message within 60 seconds and says how long to wait", async () => {
    const sentAt = 500_000;
    const h = harness(HAPPY, {
      storage: memoryStorage({ [MAIL_SENT_AT_KEY]: String(sentAt) }),
      at: sentAt + 20_000,
    });
    expect(await h.run()).toEqual(["wait 40s before sending another message"]);
    expect(h.asked).toHaveLength(0);
    expect(h.send).not.toHaveBeenCalled();

    const later = harness(HAPPY, {
      storage: memoryStorage({ [MAIL_SENT_AT_KEY]: String(sentAt) }),
      at: sentAt + MAIL_COOLDOWN_MS,
    });
    expect((await later.run()).at(-1)).toMatch(/^✓ sent/);
  });

  it("without an interactive prompt it points to the direct address", async () => {
    const h = harness([], { ask: false });
    expect(await h.run()).toEqual([`✗ could not send · email me directly at ${site.email}`]);
  });

  it("speaks Portuguese", async () => {
    const h = harness(["Jane Doe", "jane@", "jane@acme.com", "", "Mensagem longa o bastante.", "s"], {
      dict: pt.terminal,
    });
    const out = await h.run();
    expect(h.asked.map((a) => a.label)).toEqual([
      "nome:",
      "email:",
      "email:",
      "empresa (opcional):",
      "mensagem:",
      "enviar? [S/n]",
    ]);
    expect(out[0]).toBe("endereço inválido, tente de novo · 2 restante(s)");
    expect(out.at(-1)).toBe("✓ enviado · Leio todas as mensagens e respondo em uns dois dias úteis.");
  });
});
