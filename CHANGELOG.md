# Changelog

All notable changes to maarkn.dev. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/) for the site as a product (the `package.json` version is not bumped).

## [2.0.0] — terminal — 2026-09-16

The home page became an interactive terminal. Planned and shipped as fifteen spec-driven changes (`openspec/changes/archive/2026-09-15-terminal-*`), one commit each on `main`, `c76266e`…`05fcaeb` plus this documentation pass.

### Added

- Terminal home: boot sequence (once per browser session, skippable, honours `prefers-reduced-motion`, `reboot` replays it), status bar with palette/font/language controls and a clock, command menu with numeric shortcuts, prompt with synthetic cursor.
- Command engine in `src/lib/terminal/`: registry with aliases, whitespace parser, history with `↑`/`↓` mirrored in `sessionStorage`, `Tab` autocomplete (commands, `cat <file>`, `cd <dir>`), `Ctrl+C` / `Ctrl+L`, async commands that append or repaint lines, interactive prompt (`ctx.ask`) commands can take over.
- Content commands `whoami`, `experience`, `skills`, `projects` / `open <n>`, `writing` / `read <n>`, `contact`, `cv`, `ls` / `cat <file>`, `neofetch`, formatting data from the same sources as the inner pages (`TerminalData` assembled on the server).
- `ask <question>`: the RAG assistant inside the terminal with token streaming, markdown rendered in the terminal typography, per-session conversation context, `ask --new`, `Ctrl+C` abort, friendly rate-limit and failure messages, offline demo replies; optional unknown-input fallback behind `NEXT_PUBLIC_TERMINAL_ASK_FALLBACK`.
- `mail`: the contact form as a prompt conversation with inline validation (shared Zod schema), attempt limit, `Esc`/`Ctrl+C` cancel, answers kept out of the history, one send per minute per tab.
- Navigation: `cd projects|career|blog|links`, `cd ~`, `pwd`, `lang en|pt`; deep-links `/{lang}?cmd=a;b` with sanitisation; session restore (last 10 commands replayed) when returning from an inner page; old `/#about`, `/#projects`, `/#contact` anchors mapped to commands.
- Dracula palettes `soft` (default) and `classic`; monospace fonts Cascadia Code (default, Google Fonts) and DaddyTimeMono (self-hosted, OFL); pre-hydration boot script migrating the old `dark`/`dev`/`light` preferences.
- System and easter-egg commands: `help`, `clear`/`cls`, `history`, `uptime`, `date`, `echo`, `whereami`, `theme`, `font`, `reboot`, `ping`, `git`, `sudo`, `rm`, `exit`/`logout`, `hack`.
- Server-rendered fallback: MOTD, `whoami` output and a sitemap line are in the HTML, so the home works without JavaScript and crawlers see the bio and every link.
- Accessibility (WCAG 2.1 AA): landmarks, skip link to the prompt, single boot announcement, output grouped per command, `Esc` leaves the prompt, `rem` sizing, 44 px touch targets, contrast fixes for `--comment` in both palettes.
- Terminal-style OpenGraph images per route and language; sitemap and `hreflang` tests; new `>_` favicon, manifest and `#282A36` theme colour.
- Vitest with unit tests for the pure modules and jsdom tests for the shell.
- `scripts/check-dictionaries.ts` (dictionary parity, runs in `pnpm lint`) and `scripts/check-commands-doc.ts` (every registered command has a section in `.docs/design/commands.md`).

### Changed

- Inner pages (`/projects`, `/projects/[slug]`, `/career`, `/career/[slug]`, `/blog`, `/blog/[slug]`, `/links`) keep their URLs, content and metadata but render in the terminal chrome: status bar with the path, command-style breadcrumb, 82ch column, `cd ..` back link, monospace prose for Ghost posts.
- `/{lang}/chat` permanently redirects to `/{lang}?cmd=ask`.
- Admin pinned to the `soft` palette with its legacy tokens scoped to `admin.css`; no theme switcher.
- Home JavaScript budget: ~24 kB gzip page-specific (down from ~88 kB), markdown renderer and `zod` loaded on demand, only the default font preloaded.
- Docs: README (en, pt-BR), `AGENTS.md`, `DEPLOY.md`, `.env.example`, PRD v2.0.

### Removed

- The section-based home (Hero, Big Numbers, About, Toolkit, Selected work, Contact, Latest logs) and its components.
- The `light` and `dev` themes (scanlines, marquee, glitch), Konami code overlay, floating chat launcher and `/chat` page.
- Framer Motion, lucide-react from public routes, Inter / Space Grotesk / JetBrains Mono fonts, orphaned photos and boilerplate SVGs.

## [1.9.0] — 2026-07-26

Last release of the section-based site: durable rate limiting and admin usage log for the chat, RAG knowledge base with pgvector, CV generator, job-application tracker, self-hosted Postgres + Traefik stack with GitHub Actions deploy, career detail pages, project galleries, DEV CLI theme and easter eggs. See the git history before `b303418` for details.
