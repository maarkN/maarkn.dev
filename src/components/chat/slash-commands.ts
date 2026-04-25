/**
 * Easter Egg #3 — local slash commands intercepted before the message
 * hits /api/chat. Pure functions so they run synchronously in the
 * client and skip the network round-trip / OpenAI usage.
 */
export type SlashOutput = string;

const STACK = [
  "TypeScript · JavaScript · Dart",
  "NestJS · Express · Next.js · React · Vue.js",
  "Flutter · React Native · Astro",
  "PostgreSQL · MongoDB · Redis · Elastic Search · Kafka",
  "Docker · AWS · GCP · Linux · CI/CD",
];

export function runSlashCommand(input: string): SlashOutput | null {
  const cmd = input.trim().toLowerCase();
  if (!cmd) return null;

  switch (cmd) {
    case "/help":
      return [
        "available commands:",
        "  /whoami     — quick id of the human behind this site",
        "  /sudo       — request elevated privileges (denied)",
        "  /ls         — list everything you can poke around",
        "  /git        — public repos and contact links",
        "  /ping       — latency check",
        "  /stack      — daily stack",
        "  /hack       — please don't",
        "  pwd         — current working directory",
        "  date        — server-side date in São Paulo",
        "any other prompt is forwarded to the AI assistant.",
      ].join("\n");

    case "/whoami":
      return [
        "uid=1001(maarkn) gid=1001(humans) groups=1001(builders),27(open-to-work)",
        "name        Marco Antônio da Silva Filho",
        "role        Senior Fullstack Engineer",
        "location    Goiânia, BR — open to relocate",
        "since       2019",
      ].join("\n");

    case "/sudo":
      return [
        "[sudo] password for guest: ********",
        "Sorry, you are not in the sudoers file. This incident will NOT be reported.",
      ].join("\n");

    case "/ls":
      return [
        "total 7",
        "drwxr-xr-x  /                   -- home",
        "drwxr-xr-x  /projects           -- selected work",
        "drwxr-xr-x  /career             -- timeline + per-role detail",
        "drwxr-xr-x  /blog               -- field notes",
        "drwxr-xr-x  /links              -- linktree-style hub",
        "drwxr-xr-x  /chat               -- you are here",
        "-rw-r--r--  /cv/marco-filho.pdf -- résumé",
      ].join("\n");

    case "/git":
      return [
        "origin   git@github.com:maarkN/maarkn.dev.git",
        "github   https://github.com/maarkn",
        "linkedin https://linkedin.com/in/maarkn",
        "email    markimkr@gmail.com",
      ].join("\n");

    case "/ping":
      return [
        "PING maarkn.dev (127.0.0.1): 56 data bytes",
        "64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.018 ms",
        "64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.012 ms",
        "--- maarkn.dev ping statistics ---",
        "2 packets transmitted, 2 received, 0% packet loss — looking healthy.",
      ].join("\n");

    case "/stack":
      return ["~/.config/stack/$ cat day-to-day", ...STACK.map((s) => `  ${s}`)].join("\n");

    case "/hack":
      return [
        "Initiating attack vector...",
        "JK. The only thing being injected here is opportunity — say hi at markimkr@gmail.com.",
      ].join("\n");

    case "pwd":
      return "/home/maarkn";

    case "date": {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });
      return fmt.format(new Date());
    }

    default:
      return null;
  }
}
