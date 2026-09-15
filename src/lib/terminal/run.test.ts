import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHistory } from "./history";
import { createRegistry, TERMINAL_ALIASES } from "./registry";
import { createRunner, type BaseContext, type RunnerIO } from "./run";
import type { Command, OutputLine } from "./types";

type Event =
  | { type: "echo"; text: string }
  | { type: "print"; lines: OutputLine[] }
  | { type: "line"; line: OutputLine }
  | { type: "replace"; line: OutputLine }
  | { type: "clear" }
  | { type: "done"; name: string };

function setup(commands: Command[]) {
  const events: Event[] = [];
  const io: RunnerIO = {
    echo: (text) => events.push({ type: "echo", text }),
    print: (lines) => events.push({ type: "print", lines }),
    printLine: (line) => events.push({ type: "line", line }),
    replaceLast: (line) => events.push({ type: "replace", line }),
    clear: () => events.push({ type: "clear" }),
    markDone: (name) => events.push({ type: "done", name }),
  };
  const history = createHistory({ storage: null });
  const registry = createRegistry(commands, TERMINAL_ALIASES);
  const runner = createRunner({
    registry,
    history,
    io,
    format: {
      notFound: (name) => [`bash: ${name}: command not found`],
      failed: (name, error) => [`${name}: ${(error as Error).message}`],
    },
  });
  const base = {} as BaseContext;
  const run = (raw: string) => runner.run(raw, base);
  return { events, history, runner: { ...runner, run, get running() { return runner.running; } } };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const experience: Command = { name: "experience", describe: "", run: () => ["career"] };
const clear: Command = {
  name: "clear",
  describe: "",
  run: (_, ctx) => {
    ctx.clear();
    return null;
  },
};
const slow: Command = {
  name: "slow",
  describe: "",
  run: async (_, ctx) => {
    for (const n of [1, 2, 3]) {
      await sleep(100);
      ctx.print(`line ${n}`);
    }
    return ["end"];
  },
};

describe("runner", () => {
  it("echoes the line, resolves aliases and marks the resolved command as done", async () => {
    const { events, history, runner } = setup([experience]);
    await runner.run("  2 ");
    expect(events).toEqual([
      { type: "echo", text: "2" },
      { type: "done", name: "experience" },
      { type: "print", lines: ["career"] },
    ]);
    expect(history.entries).toEqual(["2"]);
  });

  it("only echoes the prompt on empty input", async () => {
    const { events, history, runner } = setup([experience]);
    await runner.run("   ");
    expect(events).toEqual([{ type: "echo", text: "" }]);
    expect(history.entries).toEqual([]);
  });

  it("prints command not found with the name as typed and runs nothing else", async () => {
    const { events, runner } = setup([experience]);
    await runner.run("foo bar");
    expect(events).toEqual([
      { type: "echo", text: "foo bar" },
      { type: "print", lines: ["bash: foo: command not found"] },
    ]);
    await runner.run("<img src=x onerror=alert(1)>");
    expect(events.at(-1)).toEqual({ type: "print", lines: ["bash: <img: command not found"] });
  });

  it("exposes the history including the current line", async () => {
    let seen: readonly string[] = [];
    const { runner } = setup([
      experience,
      {
        name: "history",
        describe: "",
        run: (_, ctx) => {
          seen = ctx.history;
          return null;
        },
      },
    ]);
    await runner.run("experience");
    await runner.run("history");
    expect(seen).toEqual(["experience", "history"]);
  });

  it("reports a thrown error instead of crashing", async () => {
    const { events, runner } = setup([
      {
        name: "boom",
        describe: "",
        run: () => {
          throw new Error("kaput");
        },
      },
    ]);
    await runner.run("boom");
    expect(events.at(-1)).toEqual({ type: "print", lines: ["boom: kaput"] });
    expect(runner.running).toBe(false);
  });

  describe("async output", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("streams lines through ctx.print and prints the result at the end", async () => {
      const { events, runner } = setup([slow]);
      const done = runner.run("slow");
      expect(runner.running).toBe(true);
      await vi.advanceTimersByTimeAsync(350);
      await done;
      expect(events).toEqual([
        { type: "echo", text: "slow" },
        { type: "done", name: "slow" },
        { type: "line", line: "line 1" },
        { type: "line", line: "line 2" },
        { type: "line", line: "line 3" },
        { type: "print", lines: ["end"] },
      ]);
      expect(runner.running).toBe(false);
    });

    it("clear aborts the running command: nothing printed after the wipe", async () => {
      const { events, runner } = setup([slow, clear]);
      const done = runner.run("slow");
      await vi.advanceTimersByTimeAsync(150);
      expect(events.at(-1)).toEqual({ type: "line", line: "line 1" });

      await runner.run("clear");
      expect(events.at(-1)).toEqual({ type: "clear" });
      const count = events.length;

      await vi.advanceTimersByTimeAsync(500);
      await done;
      expect(events.length).toBe(count);
      expect(runner.running).toBe(false);
    });

    it("Ctrl+C-style abort drops the pending result and exposes the signal", async () => {
      let aborted = false;
      const { events, runner } = setup([
        {
          name: "wait",
          describe: "",
          run: async (_, ctx) => {
            ctx.signal.addEventListener("abort", () => (aborted = true));
            await sleep(100);
            return ["never"];
          },
        },
      ]);
      const done = runner.run("wait");
      runner.abort();
      expect(aborted).toBe(true);
      await vi.advanceTimersByTimeAsync(200);
      await done;
      expect(events.some((e) => e.type === "print")).toBe(false);
    });

    it("a new command cancels the previous one", async () => {
      const { events, runner } = setup([slow, experience]);
      const first = runner.run("slow");
      await vi.advanceTimersByTimeAsync(150);
      await runner.run("experience");
      await vi.advanceTimersByTimeAsync(500);
      await first;
      expect(events.filter((e) => e.type === "line")).toHaveLength(1);
      expect(events.at(-1)).toEqual({ type: "print", lines: ["career"] });
    });
  });
});
