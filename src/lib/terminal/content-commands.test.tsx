import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "@/dictionaries/en.json";
import pt from "@/dictionaries/pt-BR.json";
import { site } from "@/lib/site";
import { buildVersion, createContentCommands } from "./content-commands";
import { FILE_NAMES } from "./files";
import { createRegistry, TERMINAL_ALIASES } from "./registry";
import { createSystemCommands } from "./system-commands";
import type { CommandContext, CommandResult, TerminalData } from "./types";

/* Fixture in the shape `loadTerminalData` produces; content is deliberately
   fake so the assertions prove the commands format `data`, not constants. */
const data: TerminalData = {
  numbers: { years: "6", products: "20+", stacks: "12", countries: "2" },
  experience: [
    { slug: "acme-lead", period: "2024 — Now", company: "Acme", role: "Lead", summary: "Ran it.", current: true },
    { slug: "globex-dev", period: "2020 — 2024", company: "Globex", role: "Dev", summary: "Built it." },
  ],
  skills: {
    groups: [
      { key: "frontend", items: ["TypeScript", "React"] },
      { key: "backend", items: ["Node.js", "Go"] },
    ],
    metrics: [
      { label: "API Architecture", value: 95 },
      { label: "Mobile Delivery", value: 80 },
    ],
  },
  projects: ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"].map((slug, i) => ({
    slug,
    name: slug,
    year: String(2020 + i),
    category: "ai",
    status: i % 2 ? "nda" : "live",
    stack: ["TS"],
    tagline: `${slug} does things`,
  })),
  projectLabels: en.projects,
  posts: [
    { slug: "first-post", title: "First post", tags: ["AI"], publishedAt: "2026-04-12T14:00:00.000Z", readingTime: 5 },
    { slug: "second-post", title: "Second post", tags: [], publishedAt: "2026-03-01T10:00:00.000Z", readingTime: 0 },
  ],
  minRead: en.blog.readingTime,
};

type Harness = {
  ctx: CommandContext;
  navigate: ReturnType<typeof vi.fn>;
  openExternal: ReturnType<typeof vi.fn>;
  run: (line: string) => Promise<string[]>;
};

/** Registry with the real content + system commands and a stubbed host. */
function harness(dict = en.terminal, overrides: Partial<TerminalData> = {}, locale = "en"): Harness {
  const registry = createRegistry(
    [...createContentCommands(dict), ...createSystemCommands(dict)],
    TERMINAL_ALIASES,
  );
  const navigate = vi.fn();
  const openExternal = vi.fn();
  const ctx: CommandContext = {
    locale,
    dict,
    data: { ...data, ...overrides },
    theme: {
      theme: "soft",
      font: "caskaydia",
      setTheme: vi.fn(),
      setFont: vi.fn(),
      toggleTheme: () => "classic",
      toggleFont: () => "daddytime",
    },
    navigate,
    openExternal,
    history: [],
    commands: registry.list(),
    clear: vi.fn(),
    reboot: vi.fn(),
    print: vi.fn(),
    replaceLast: vi.fn(),
    signal: new AbortController().signal,
    state: {},
  };
  const run = async (line: string) => {
    const [name, ...args] = line.split(/\s+/);
    const command = registry.resolve(name!);
    if (!command) throw new Error(`unknown command ${name}`);
    const result: CommandResult = await command.run(args, ctx);
    return (result ?? []).map((l) => (l === "" ? "" : renderToStaticMarkup(<>{l}</>)));
  };
  return { ctx, navigate, openExternal, run };
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#x27": "'" };
const text = (html: string[]) =>
  html
    .join("\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#x27);/g, (_, name: string) => ENTITIES[name]!);

describe("registration order", () => {
  it("lists content commands before the system ones in help and completion", () => {
    const { ctx } = harness();
    const names = ctx.commands.map((c) => c.name);
    expect(names.slice(0, 7)).toEqual([
      "whoami",
      "experience",
      "skills",
      "projects",
      "writing",
      "contact",
      "cv",
    ]);
    expect(names.filter((n) => n.startsWith("w"))).toEqual(["whoami", "writing", "whereami"]);
  });

  it("help shows the mockup table and also-try line", async () => {
    const { run } = harness();
    const out = text(await run("help"));
    const table = out.match(/^(whoami|experience|skills|projects|writing|contact|cv|clear)/gm);
    expect(table).toEqual(["whoami", "experience", "skills", "projects", "writing", "contact", "cv", "clear"]);
    expect(out).toContain("also try: ls · cat <file> · neofetch · theme · font · history · uptime · reboot");
    expect(out).toContain("selected work · open <n> reads a case");
  });

  it("menu shortcuts resolve to the content commands", async () => {
    const { run } = harness();
    expect(text(await run("2"))).toContain("experience.log");
    expect(text(await run("4"))).toContain("projects.db");
  });
});

describe("whoami", () => {
  it("prints identity, paragraphs and the big numbers", async () => {
    const out = text(await harness().run("whoami"));
    expect(out).toContain(`${site.name} · ${site.nick}`);
    expect(out).toContain("Senior AI/LLM & Backend Engineer · Goiânia, Brazil");
    expect(out).toContain("Done it 20+ times");
    expect(out).toContain("6years building");
    expect(out).toContain("2countries I've delivered for");
    expect(out).toContain("→ experience for the timeline · contact to reach me");
  });

  it("dims the asides and translates in pt-BR", async () => {
    const html = await harness(pt.terminal, {}, "pt-BR").run("whoami");
    expect(html.join("")).toMatch(/<span class="[^"]*">\(Claude, Cursor, Codex\)<\/span>/);
    expect(text(html)).toContain("Já fiz isso 20+ vezes");
  });
});

describe("experience", () => {
  it("links every position to its career page without anchors", async () => {
    const html = await harness().run("experience");
    const joined = html.join("");
    expect(joined).toContain('href="/en/career/acme-lead"');
    expect(joined).toContain('href="/en/career/globex-dev"');
    expect(joined).not.toContain('id="acme-lead"');
    expect(text(html)).toContain("everything else at maarkn.dev/en/career");
  });
});

describe("skills", () => {
  it("renders groups joined by · and 20-block bars", async () => {
    const html = await harness().run("skills");
    const out = text(html);
    expect(out).toContain("frontendTypeScript · React");
    const line = html.find((l) => l.includes("api architecture"))!;
    expect(line.match(/█/g)).toHaveLength(19);
    expect(line.match(/░/g)).toHaveLength(1);
    expect(text([line])).toContain("95%");
  });
});

describe("projects and open", () => {
  it("numbers the featured projects and opens by index", async () => {
    const h = harness();
    const out = text(await h.run("projects"));
    expect(out).toContain("projects.db · 6 of 20+ · some stay behind an NDA");
    expect(out).toContain("[1]alpha");
    expect(out).toContain("● Live");
    expect(out).toContain("● Under NDA");
    expect(text(await h.run("open 2"))).toBe("opening bravo");
    expect(h.navigate).toHaveBeenCalledWith("/en/projects/bravo");
  });

  it("rejects an index outside the last list", async () => {
    const h = harness();
    await h.run("projects");
    expect(text(await h.run("open 99"))).toBe("open: pick a number 1–6 · see projects");
    expect(text(await h.run("open"))).toBe("open: pick a number 1–6 · see projects");
    expect(text(await h.run("open x"))).toBe("open: pick a number 1–6 · see projects");
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it("falls back to the default order before any listing", async () => {
    const h = harness();
    expect(text(await h.run("open 1"))).toBe("opening alpha");
    expect(h.navigate).toHaveBeenCalledWith("/en/projects/alpha");
  });
});

describe("writing and read", () => {
  it("lists posts with tag · month · reading time and reads by index", async () => {
    const h = harness();
    const out = text(await h.run("writing"));
    expect(out).toContain("[1]First post");
    expect(out).toContain("AI · 2026-04 · 5 min read");
    expect(out).toContain("2026-03 · 1 min read");
    expect(text(await h.run("read 1"))).toBe("opening First post");
    expect(h.navigate).toHaveBeenCalledWith("/en/blog/first-post");
    expect(text(await h.run("read 3"))).toBe("read: pick a number 1–2 · see writing");
  });

  it("shows a friendly message when there are no posts", async () => {
    const h = harness(en.terminal, { posts: [] });
    const out = text(await h.run("writing"));
    expect(out).toContain("writing.md is empty right now");
    expect(out).not.toContain("read <n>");
  });
});

describe("contact and cv", () => {
  it("prints every channel from lib/site", async () => {
    const html = await harness().run("contact");
    const joined = html.join("");
    expect(joined).toContain(`href="mailto:${site.email}"`);
    expect(joined).toContain(`href="${site.social.linkedin}"`);
    expect(joined).toContain(`href="${site.social.github}"`);
    expect(joined).toContain(`href="${site.social.whatsapp}"`);
    expect(joined).toMatch(new RegExp(`href="${site.cvPath}"[^>]*target="_blank"`));
    expect(text(html)).toContain("● available for new projects");
    expect(text(html)).toContain("America/Sao_Paulo");
  });

  it("cv opens the PDF in a new tab and prints the link", async () => {
    const h = harness();
    const html = await h.run("cv");
    expect(h.openExternal).toHaveBeenCalledWith(site.cvPath);
    expect(text(html)).toBe("opening marco-filho.pdf");
    expect(html[0]).toMatch(new RegExp(`href="${site.cvPath}"[^>]*target="_blank"`));
  });
});

describe("ls and cat", () => {
  it("ls prints the seven files", async () => {
    const out = text(await harness().run("ls"));
    expect(out).toBe(FILE_NAMES.join("  "));
    expect(out).toBe("whoami.txt  experience.log  skills.sys  projects.db  writing.md  contact.sh  cv.pdf");
  });

  it("cat <file> prints the same as the command", async () => {
    const h = harness();
    expect(await h.run("cat skills.sys")).toEqual(await h.run("skills"));
    expect(text(await h.run("cat"))).toBe("cat: missing file · try ls");
    expect(text(await h.run("cat nope.txt"))).toBe("cat: nope.txt: no such file · try ls");
  });
});

describe("neofetch", () => {
  it("prints the table and eight palette swatches bound to CSS variables", async () => {
    const html = await harness().run("neofetch");
    const out = text(html);
    expect(out).toContain("maarkn@dev");
    expect(out).toContain(`os${site.domain} ${buildVersion()}`);
    expect(out).toContain("uptime6 years, 20+ products");
    expect(out).toContain("packages12 stacks (see skills)");
    const swatches = html[2]!.match(/background:var\(--[a-z]+\)/g);
    expect(swatches).toEqual(
      ["red", "orange", "yellow", "green", "cyan", "purple", "pink", "fg"].map(
        (c) => `background:var(--${c})`,
      ),
    );
  });

  it("derives the version from the build stamp or the date", () => {
    expect(buildVersion(new Date(2026, 8, 15))).toMatch(/^\d{4}\.\d{2}$/);
  });
});

describe("i18n invariants", () => {
  it("keeps command and file names in English in pt-BR", async () => {
    const h = harness(pt.terminal, {}, "pt-BR");
    const out = text(await h.run("help"));
    for (const name of ["whoami", "experience", "skills", "projects", "writing", "contact", "cv"]) {
      expect(out).toContain(name);
    }
    expect(out).toContain("quem sou e o que faço");
    expect(text(await h.run("ls"))).toContain("skills.sys");
    expect(text(await h.run("cat"))).toBe("cat: arquivo não informado · tente ls");
  });
});
