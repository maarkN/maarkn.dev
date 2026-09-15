/* eslint-disable react/jsx-key -- every OutputLine is rendered on its own
   inside <Line>, never as a React child array, so keys are meaningless here. */
import { Fragment } from "react";
import { FONTS, THEMES, type Font, type Theme } from "@/components/theme-provider";
import { A, C, Cmd, D, G, O, R, Row } from "@/components/terminal/primitives";
import type { TerminalLabels } from "@/components/terminal/types";
import { site } from "@/lib/site";
import { rich } from "./rich";
import type { Command, CommandContext, OutputLine } from "./types";

/*
 * Commands that exist in every locale and need no site data: help, screen
 * control, theme/font, history and the usual shell jokes. Content commands
 * (whoami, projects, …) are registered by the host before these so that
 * `help` and Tab completion keep the mockup's order.
 */

const FONT_LABEL: Record<Font, string> = {
  caskaydia: "Caskaydia Cove / Cascadia Code",
  daddytime: "DaddyTimeMono",
};

const isTheme = (v: string | undefined): v is Theme => THEMES.includes(v as Theme);
const isFont = (v: string | undefined): v is Font => FONTS.includes(v as Font);

/** Lines `ping` prints, with a short pause between the replies. */
const PING_LINES = [
  `PING ${site.domain} (127.0.0.1): 56 data bytes`,
  "64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.018 ms",
  "64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.012 ms",
];
const PING_STEP_MS = 160;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/* ── font availability ─────────────────────────────────────────── */

const FONT_PROBE_TIMEOUT_MS = 3000;

/**
 * `next/font/local` registers DaddyTimeMono under a hashed family name that
 * only reaches CSS through `--font-daddytime`; probe that face (falling back
 * to the literal family for a locally installed copy).
 */
function daddytimeFontSpec(): string {
  const list = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-daddytime")
    .trim();
  const first = list.split(",")[0]?.trim();
  return `12px ${first || '"DaddyTimeMono"'}`;
}

async function fontAvailable(spec: string): Promise<boolean> {
  if (typeof document === "undefined" || !("fonts" in document)) return true;
  try {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), FONT_PROBE_TIMEOUT_MS),
    );
    const loaded = await Promise.race([document.fonts.load(spec), timeout]);
    return loaded !== null && document.fonts.check(spec);
  } catch {
    return false;
  }
}

/* ── messages the engine prints on its own ─────────────────────── */

export function formatNotFound(labels: TerminalLabels, name: string): OutputLine[] {
  return [
    <>
      bash: {name}: {labels.messages.notFound} <D>{rich(labels.messages.typeHelp)}</D>
    </>,
  ];
}

export function formatFailed(labels: TerminalLabels, name: string, error: unknown): OutputLine[] {
  const detail = error instanceof Error ? error.message : String(error);
  return [
    <>
      <R>
        {name}: {labels.messages.failed}
      </R>{" "}
      <D>{detail}</D>
    </>,
  ];
}

/** Tab completion candidates, two spaces apart, in cyan. */
export function formatCandidates(names: readonly string[]): OutputLine {
  return (
    <>
      {names.map((name, i) => (
        <Fragment key={name}>
          {i > 0 && "  "}
          <C>{name}</C>
        </Fragment>
      ))}
    </>
  );
}

/* ── commands ──────────────────────────────────────────────────── */

export function createSystemCommands(labels: TerminalLabels): Command[] {
  const { help, messages } = labels;
  const describe = (name: string) => help.describe[name] ?? name;

  const helpCommand: Command = {
    name: "help",
    describe: describe("help"),
    secret: true,
    run: (_, ctx) => {
      const listed = ctx.commands.filter((c) => !c.hidden && !c.secret);
      const aside = ctx.commands.filter((c) => c.hidden && !c.secret);
      const lines: OutputLine[] = [<D>{help.heading}</D>, ""];
      for (const c of listed) {
        lines.push(
          <Row label={<Cmd>{c.name}</Cmd>} width="w12">
            {c.describe}
          </Row>,
        );
      }
      lines.push("");
      if (aside.length > 0) {
        lines.push(
          <D>
            {help.alsoTry}{" "}
            {aside.map((c, i) => (
              <Fragment key={c.name}>
                {i > 0 && " · "}
                <Cmd>{c.usage ?? c.name}</Cmd>
              </Fragment>
            ))}
          </D>,
        );
      }
      lines.push(<D>{help.shortcuts}</D>);
      return lines;
    },
  };

  const clear: Command = {
    name: "clear",
    describe: describe("clear"),
    run: (_, ctx) => {
      ctx.clear();
      return null;
    },
  };

  const theme: Command = {
    name: "theme",
    usage: "theme",
    describe: describe("theme"),
    hidden: true,
    run: ([arg], ctx) => {
      let next: Theme;
      if (isTheme(arg)) {
        next = arg;
        ctx.theme.setTheme(next);
      } else {
        next = ctx.theme.toggleTheme();
      }
      return [
        <>
          theme → <C>{next}</C>{" "}
          <D>{next === "soft" ? messages.themeSoft : messages.themeClassic}</D>
        </>,
      ];
    },
  };

  const font: Command = {
    name: "font",
    usage: "font",
    describe: describe("font"),
    hidden: true,
    run: async ([arg], ctx) => {
      let next: Font;
      if (isFont(arg)) {
        next = arg;
        ctx.theme.setFont(next);
      } else {
        next = ctx.theme.toggleFont();
      }
      const line = (
        <>
          font → <C>{FONT_LABEL[next]}</C>
        </>
      );
      if (next !== "daddytime") return [line];
      // Print now; the availability probe may take a moment.
      ctx.print(line);
      if (await fontAvailable(daddytimeFontSpec())) return null;
      return [<O>{messages.fontUnavailable}</O>];
    },
  };

  const history: Command = {
    name: "history",
    describe: describe("history"),
    hidden: true,
    run: (_, ctx) =>
      ctx.history.length > 0
        ? ctx.history.map((entry, n) => (
            <>
              <D>{String(n + 1).padStart(3)}</D>
              {"  "}
              {entry}
            </>
          ))
        : [<D>{messages.noHistory}</D>],
  };

  const uptime: Command = {
    name: "uptime",
    describe: describe("uptime"),
    hidden: true,
    run: () => [
      <>
        {messages.uptime} <D>{messages.uptimeLoad}</D>
      </>,
    ],
  };

  const date: Command = {
    name: "date",
    describe: describe("date"),
    secret: true,
    run: () => [new Date().toString()],
  };

  const echo: Command = {
    name: "echo",
    describe: describe("echo"),
    secret: true,
    run: (args) => [args.join(" ")],
  };

  const whereami: Command = {
    name: "whereami",
    describe: describe("whereami"),
    secret: true,
    run: () => [messages.whereami],
  };

  const sudo: Command = {
    name: "sudo",
    describe: describe("sudo"),
    secret: true,
    run: () => [
      <>
        {messages.sudoPassword} <D>********</D>
      </>,
      <>
        <R>{messages.sudoDenied}</R> {messages.sudoReported}
      </>,
    ],
  };

  const rm: Command = {
    name: "rm",
    describe: describe("rm"),
    secret: true,
    run: (args) => [
      <>
        {messages.rmDenied.replace("{target}", args.join(" ") || "/")} <D>{messages.rmNiceTry}</D>
      </>,
    ],
  };

  const exit: Command = {
    name: "exit",
    describe: describe("exit"),
    secret: true,
    run: () => [
      messages.exit,
      <D>
        {messages.exitJoke} <Cmd>contact</Cmd>
      </D>,
    ],
  };

  /* ── the old chat's slash commands, now regular (hidden) commands ── */

  const ping: Command = {
    name: "ping",
    describe: describe("ping"),
    hidden: true,
    run: async (_, ctx) => {
      for (const line of PING_LINES) {
        ctx.print(line);
        await sleep(PING_STEP_MS);
        if (ctx.signal.aborted) return null;
      }
      return [<D>--- {site.domain} ping statistics ---</D>, <G>{messages.pingHealthy}</G>];
    },
  };

  const git: Command = {
    name: "git",
    describe: describe("git"),
    hidden: true,
    run: () => [
      <Row width="w10" label="origin">
        <D>git@github.com:{site.nick}/{site.domain}.git</D>
      </Row>,
      <Row width="w10" label="github">
        <A href={site.social.github} />
      </Row>,
      <Row width="w10" label="linkedin">
        <A href={site.social.linkedin} />
      </Row>,
      <Row width="w10" label="email">
        <A href={`mailto:${site.email}`}>{site.email}</A>
      </Row>,
    ],
  };

  const pwd: Command = {
    name: "pwd",
    describe: describe("pwd"),
    hidden: true,
    run: () => [`/home/${site.nick}`],
  };

  const hack: Command = {
    name: "hack",
    describe: describe("hack"),
    hidden: true,
    run: () => [
      <R>{messages.hackInit}</R>,
      <>
        {messages.hackJoke} <Cmd>contact</Cmd>
      </>,
    ],
  };

  // Wipes the screen and reruns the boot overlay, both through the host.
  const reboot: Command = {
    name: "reboot",
    describe: describe("reboot"),
    hidden: true,
    run: (_, ctx: CommandContext) => {
      ctx.reboot();
      return null;
    },
  };

  return [
    helpCommand,
    theme,
    font,
    history,
    uptime,
    date,
    echo,
    whereami,
    sudo,
    rm,
    exit,
    { ...exit, name: "logout", secret: true },
    clear,
    { ...clear, name: "cls", secret: true },
    reboot,
    ping,
    git,
    pwd,
    hack,
  ];
}
