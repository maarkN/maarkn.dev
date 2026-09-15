/* eslint-disable react/jsx-key -- every OutputLine is rendered on its own
   inside <Line>, never as a React child array, so keys are meaningless here. */
import { A, B, Bar, C, Cmd, D, G, O, P, Row, Y } from "@/components/terminal/primitives";
import s from "@/components/terminal/terminal.module.css";
import type { TerminalLabels } from "@/components/terminal/types";
import { site } from "@/lib/site";
import { FILES, FILE_NAMES } from "./files";
import { experienceLines, projectsLines, writingLines } from "./listings";
import { rich } from "./rich";
import type { Command, CommandContext, OutputLine, TerminalData } from "./types";

/*
 * The commands that show who Marco is: whoami, experience, skills, projects,
 * writing, contact, cv, open/read, ls/cat and neofetch. They only format
 * what arrives in `ctx.data` (assembled on the server from the same sources
 * as the inner pages), `ctx.dict` and `lib/site`; nothing here is content.
 * The host registers them before the system commands so `help` and Tab
 * completion keep the mockup's order.
 */

/** Numbered list the visitor saw last; `open`/`read` resolve indexes against it. */
export type LastList = {
  kind: "projects" | "writing";
  items: { slug: string; label: string }[];
};

const NEOFETCH_ART = [
  "███     ███",
  "████   ████",
  "██ ██ ██ ██",
  "██  ███  ██",
  "██   █   ██",
  "██       ██",
].join("\n");

/** Palette samples printed by `neofetch`, in mockup order. */
const SWATCHES = ["red", "orange", "yellow", "green", "cyan", "purple", "pink", "fg"] as const;

/** `YYYY.MM` of the build, or of today when the build did not stamp one. */
export function buildVersion(now = new Date()): string {
  const stamped = process.env.NEXT_PUBLIC_BUILD_DATE;
  if (stamped && /^\d{4}\.\d{2}$/.test(stamped)) return stamped;
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Colour of a file name in `ls`, by extension. */
function fileName(name: string) {
  if (name.endsWith(".sh")) return <G>{name}</G>;
  if (name.endsWith(".pdf")) return <O>{name}</O>;
  return <C>{name}</C>;
}

const CV_FILE = site.cvPath.split("/").pop() ?? site.cvPath;

/**
 * What `whoami` prints: name, role, the bio paragraphs and the four numbers.
 * Pure and server-safe — the home renders it on the server as the first
 * output of the session (the fallback crawlers and no-JS visitors read) and
 * the command prints the very same tree when the visitor runs it again.
 */
export function whoamiLines(dict: TerminalLabels, data: TerminalData): OutputLine[] {
  const { numbers } = data;
  const stats = dict.whoami.stats;
  const lines: OutputLine[] = [
    <>
      <B>{site.name}</B> <D>· {site.nick}</D>
    </>,
    <>
      <P>{dict.whoami.role}</P>{" "}
      <D>
        {rich(dict.whoami.location, {
          city: site.location.city,
          country: site.location.country,
        })}
      </D>
    </>,
  ];
  for (const paragraph of dict.whoami.paragraphs) {
    lines.push("", rich(paragraph, numbers));
  }
  lines.push("");
  for (const key of ["years", "products", "stacks", "countries"] as const) {
    lines.push(
      <Row width="w4" label={<Y>{numbers[key]}</Y>}>
        {stats[key]}
      </Row>,
    );
  }
  lines.push(
    "",
    <D>
      {rich(dict.whoami.footer, {
        experience: <Cmd>experience</Cmd>,
        contact: <Cmd>contact</Cmd>,
      })}
    </D>,
  );
  return lines;
}

export function createContentCommands(labels: TerminalLabels): Command[] {
  const { help, messages, errors } = labels;
  const describe = (name: string) => {
    const text = help.describe[name] ?? name;
    const hint = help.hints[name];
    return hint ? (
      <>
        {text} <D>{rich(hint)}</D>
      </>
    ) : (
      text
    );
  };
  const siteLink = (lang: string, path: string) => (
    <A href={`/${lang}/${path}`}>
      {site.domain}/{lang}/{path}
    </A>
  );

  /* ── whoami ───────────────────────────────────────────────────── */

  const whoami: Command = {
    name: "whoami",
    describe: describe("whoami"),
    run: (_, { data, dict }) => whoamiLines(dict, data),
  };

  /* ── experience ───────────────────────────────────────────────── */

  const experience: Command = {
    name: "experience",
    describe: describe("experience"),
    run: (_, { data, dict, locale }) => [
      <D>{dict.pages.career.header}</D>,
      "",
      ...experienceLines(data.experience, {
        lang: locale,
        readCase: dict.pages.career.readCase,
        anchors: false,
      }),
      <D>{rich(dict.experience.footer, { link: siteLink(locale, "career") })}</D>,
    ],
  };

  /* ── skills ───────────────────────────────────────────────────── */

  const skills: Command = {
    name: "skills",
    describe: describe("skills"),
    run: (_, { data, dict, locale }) => [
      <D>{dict.skills.header}</D>,
      "",
      ...data.skills.groups.map((group) => (
        <Row width="w10" label={<C>{group.key}</C>}>
          {group.items.join(" · ")}
        </Row>
      )),
      "",
      ...data.skills.metrics.map((metric) => (
        <Row width="w22" label={metric.label.toLocaleLowerCase(locale)}>
          <Bar value={metric.value} />
        </Row>
      )),
    ],
  };

  /* ── projects / open ──────────────────────────────────────────── */

  const projects: Command = {
    name: "projects",
    describe: describe("projects"),
    run: (_, ctx) => {
      const { data, dict, locale } = ctx;
      ctx.state.lastList = {
        kind: "projects",
        items: data.projects.map((p) => ({ slug: p.slug, label: p.slug })),
      } satisfies LastList;
      return [
        <D>
          {rich(dict.projects.header, {
            count: String(data.projects.length),
            total: data.numbers.products,
          })}
        </D>,
        "",
        ...projectsLines(data.projects, { lang: locale, ...data.projectLabels }),
        <D>
          {rich(dict.projects.footer, {
            open: <Cmd>open &lt;n&gt;</Cmd>,
            link: siteLink(locale, "projects"),
          })}
        </D>,
      ];
    },
  };

  /** Items `open`/`read` pick from: the last printed list of that kind, else the default order. */
  function listFor(kind: LastList["kind"], ctx: CommandContext): LastList["items"] {
    const last = ctx.state.lastList as LastList | undefined;
    if (last?.kind === kind) return last.items;
    return kind === "projects"
      ? ctx.data.projects.map((p) => ({ slug: p.slug, label: p.slug }))
      : ctx.data.posts.map((p) => ({ slug: p.slug, label: p.title }));
  }

  function pick(items: LastList["items"], arg: string | undefined) {
    const n = /^\d+$/.test(arg ?? "") ? Number(arg) : NaN;
    return n >= 1 && n <= items.length ? items[n - 1] : undefined;
  }

  const open: Command = {
    name: "open",
    usage: "open <n>",
    describe: describe("open"),
    secret: true,
    run: ([arg], ctx) => {
      const items = listFor("projects", ctx);
      const item = pick(items, arg);
      if (!item) {
        return [
          <>
            {rich(errors.openRange, { n: String(items.length) })} <D>{rich(errors.seeProjects)}</D>
          </>,
        ];
      }
      const href = `/${ctx.locale}/projects/${item.slug}`;
      ctx.navigate(href);
      return [
        <>
          {messages.opening} <A href={href}>{item.label}</A>
        </>,
      ];
    },
  };

  /* ── writing / read ───────────────────────────────────────────── */

  const writing: Command = {
    name: "writing",
    describe: describe("writing"),
    run: (_, ctx) => {
      const { data, dict, locale } = ctx;
      const lines: OutputLine[] = [<D>{dict.pages.writing.header}</D>, ""];
      if (data.posts.length === 0) {
        lines.push(<D>{dict.writing.empty}</D>);
        return lines;
      }
      ctx.state.lastList = {
        kind: "writing",
        items: data.posts.map((p) => ({ slug: p.slug, label: p.title })),
      } satisfies LastList;
      lines.push(
        ...writingLines(data.posts, { lang: locale, minRead: data.minRead }),
        <D>
          {rich(dict.writing.footer, {
            read: <Cmd>read &lt;n&gt;</Cmd>,
            link: siteLink(locale, "blog"),
          })}
        </D>,
      );
      return lines;
    },
  };

  const read: Command = {
    name: "read",
    usage: "read <n>",
    describe: describe("read"),
    secret: true,
    run: ([arg], ctx) => {
      const items = listFor("writing", ctx);
      const item = pick(items, arg);
      if (!item) {
        return [
          <>
            {rich(errors.readRange, { n: String(items.length) })} <D>{rich(errors.seeWriting)}</D>
          </>,
        ];
      }
      const href = `/${ctx.locale}/blog/${item.slug}`;
      ctx.navigate(href);
      return [
        <>
          {messages.opening} <A href={href}>{item.label}</A>
        </>,
      ];
    },
  };

  /* ── contact / cv ─────────────────────────────────────────────── */

  const contact: Command = {
    name: "contact",
    describe: describe("contact"),
    run: (_, { dict }) => {
      const l = dict.pages.links.labels;
      const c = dict.contact;
      return [
        <D>{c.header}</D>,
        "",
        <Row width="w10" label={l.email}>
          <A href={`mailto:${site.email}`}>{site.email}</A>
        </Row>,
        <Row width="w10" label={l.linkedin}>
          <A href={site.social.linkedin} />
        </Row>,
        <Row width="w10" label={l.github}>
          <A href={site.social.github} />
        </Row>,
        <Row width="w10" label={l.whatsapp}>
          <A href={site.social.whatsapp}>{site.phone}</A>
        </Row>,
        <Row width="w10" label={l.cv}>
          <A href={site.cvPath} external>
            {CV_FILE}
          </A>
        </Row>,
        "",
        <Row width="w10" label={l.status}>
          <G>{site.available ? c.available : c.unavailable}</G> {c.statusNote}
        </Row>,
        <Row width="w10" label={c.timezone}>
          {c.timezoneValue}
        </Row>,
        "",
        <D>{rich(dict.mail.hint, { mail: <Cmd>mail</Cmd> })}</D>,
        <D>{c.footer}</D>,
      ];
    },
  };

  const cv: Command = {
    name: "cv",
    describe: describe("cv"),
    run: (_, ctx) => {
      ctx.openExternal(site.cvPath);
      return [
        <>
          {messages.opening}{" "}
          <A href={site.cvPath} external>
            {CV_FILE}
          </A>
        </>,
      ];
    },
  };

  /* ── ls / cat ─────────────────────────────────────────────────── */

  const ls: Command = {
    name: "ls",
    describe: describe("ls"),
    hidden: true,
    run: () => [
      <>
        {FILE_NAMES.map((name, i) => (
          <span key={name}>
            {i > 0 && "  "}
            {fileName(name)}
          </span>
        ))}
      </>,
    ],
  };

  const cat: Command = {
    name: "cat",
    usage: "cat <file>",
    describe: describe("cat"),
    hidden: true,
    run: ([file], ctx) => {
      if (!file) {
        return [
          <>
            {errors.catMissing} <D>{rich(errors.tryLs)}</D>
          </>,
        ];
      }
      const target = FILES[file];
      const command = target ? ctx.commands.find((c) => c.name === target) : undefined;
      if (!command) {
        return [
          <>
            {rich(errors.catNoSuch, { file })} <D>{rich(errors.tryLs)}</D>
          </>,
        ];
      }
      return command.run([], ctx);
    },
  };

  /* ── neofetch ─────────────────────────────────────────────────── */

  const neofetch: Command = {
    name: "neofetch",
    describe: describe("neofetch"),
    hidden: true,
    run: (_, { data, dict }) => {
      const n = dict.neofetch;
      const values = { ...data.numbers, city: site.location.city };
      const info: [string, OutputLine][] = [
        ["os", `${site.domain} ${buildVersion()}`],
        ["host", rich(n.host, values)],
        ["uptime", rich(n.uptime, values)],
        ["shell", n.shell],
        ["kernel", n.kernel],
        ["packages", rich(n.packages, values)],
        ["editor", n.editor],
        ["status", <G>{n.status}</G>],
      ];
      return [
        <div className={s.nf}>
          <pre className={s.art}>{NEOFETCH_ART}</pre>
          <div>
            <div>
              <G>{site.nick}</G>
              <D>@</D>
              <G>dev</G>
            </div>
            <div>
              <D>──────────</D>
            </div>
            {info.map(([label, value]) => (
              <Row key={label} width="w9" label={<P>{label}</P>}>
                {value}
              </Row>
            ))}
          </div>
        </div>,
        "",
        <>
          {SWATCHES.map((name) => (
            <span
              key={name}
              className={s.sw}
              style={{ background: `var(--${name})` }}
              aria-hidden="true"
            />
          ))}
        </>,
      ];
    },
  };

  return [
    whoami,
    experience,
    skills,
    projects,
    writing,
    contact,
    cv,
    open,
    read,
    ls,
    cat,
    neofetch,
  ];
}
