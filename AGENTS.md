<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# maarkn.dev

Public portfolio (`src/app/[lang]`) and a private backoffice (`src/app/admin`) with an MCP server (`src/app/api/mcp`), on one Next.js app, self-hosted. The repository is **public** and meant to be forkable: secrets, third-party personal data, NDA client names and third-party images stay out of it.

## Read first

- `GLOSSARY.md` before naming anything or writing docs: one word per concept, each with the words to avoid.
- `docs/adr/` before changing architecture, storage, MCP permissions or the home's rendering. A change that contradicts an ADR says so.
- `docs/design/` before building any screen of the rebranding: themes, hologram frame, projection, every screen and its copy.
- `src/app/admin/AGENTS.md` before touching `src/app/admin`, `src/app/_actions`, `src/components/admin` or `src/components/ui`.
- `src/lib/terminal/AGENTS.md` before touching `src/lib/terminal` or `src/components/terminal` (the CLI version of the site).
- `openspec/config.yaml` before writing a change, and `docs/roteiro.md` before starting one: it holds the order and the dependencies.

These files describe what exists today. The task that invalidates a written rule rewrites it in the same change.

## Workflow

- Behavior changes go through OpenSpec: `/openspec-propose`, `/openspec-apply-change`, `/openspec-archive-change`. Artifacts are in Brazilian Portuguese; structural headings and SHALL/MUST stay in English. `openspec validate --all --strict` passes before a commit.
- A push to `main` deploys to production. Work on a branch. The rebranding (`rebrand-*` changes) lands on `feat/rebranding` and reaches `main` once, in `rebrand-12-cutover`; every other change goes to `main`.
- `deploy.yml` runs on a self-hosted runner and stays free of `pull_request` triggers; `self-hosted` appears in no other workflow.
- Gates: `pnpm lint` (ESLint, dictionary parity, admin utility guard, theme contrast), `pnpm test`, `pnpm build`. Run the build without `DATABASE_URL`, as CI does.

## Site UI

Built on `docs/design/fundamentos.md` and `docs/design/moldura.md`. Every element that answers a click uses a primitive of `src/components/holo/`; what does not answer never gets a frame, except the window.

| Primitive | Use |
|---|---|
| `HoloButton`, `HoloIconButton` (`button.tsx`) | Actions. 34, 44 or 50 px; `variant="primary"`; `pressed` for a toggle |
| `HoloLink`, `HoloAnchor` (`link.tsx`) | A link that looks like a button; the anchor is for a file or another document |
| `BeamLink` (`link.tsx`) | A link inside running text |
| `HoloTag` (`tag.tsx`) | The label of a section, and the rail item it becomes |
| `HoloCard`, `HoloScreen` (`card.tsx`) | A card with one target; the screen is a card with an image |
| `HoloDialog` (`dialog.tsx`) | Window: traps the focus, closes with `Esc`, button or click outside |
| `HoloField` (`field.tsx`) | Labelled text field, with hint and error |
| `HoloSwitch` (`switch.tsx`) | On or off, at once |
| `HoloTabs` (`tabs.tsx`) | Tabs |
| `HoloNotice` (`notice.tsx`) | Result of an action. Content, so solid |
| `HoloFrame` (`frame.tsx`) | The frame itself, for a new primitive only. Geometry is `src/lib/frame/` (pure) |

- A layout that shows site screens renders `.site-root` with `siteFontVars` (`src/app/site-fonts.ts`), imports `src/app/site.css` and mounts `SiteThemeSync`. Outside `.site-root` the site's tokens do not exist; the CLI version keeps its own, under some of the same names.
- Theme: `useSiteTheme` / `setSiteTheme` (`src/components/site-theme.tsx`). The inline boot script (`src/lib/theme-boot.ts`) is the only one; add to it, never a second.
- Colours come from the tokens. `--ink-3`, `--beam`, `--beam-2` and `--bad` are for large bold text, icons and edges on `--bg-3`, so a `BeamLink` or a `HoloField` goes on the other surfaces. Text inside a hologram is `--ink` (or `--ink-2` in cards and windows); `BeamLink` and `HoloField` already switch to it there.
- Cards go on `--bg` or `--bg-2`, and the tag of a section on `--bg`. A new colour in `holo.module.css` enters `WRITTEN` (`src/lib/theme-audit.ts`) with the places it is read over.
- Primitives carry no visible string: names such as `closeLabel` come from the dictionaries through props.
- `/[lang]/holo` shows every primitive and state. It exists in `pnpm dev` and in `HOLO_REFERENCE=1 pnpm build` (`*.dev.tsx`), never in production. A new state or primitive goes there, and `node scripts/e2e-site.mjs --holo` covers it.

### Chrome

`src/app/[lang]/(site)/layout.tsx` gives every page of the site its top, foot and menu at the base (`src/components/site/`); the CLI version is in `(terminal)`, outside it.

- A page of the site is a `<main id="content" tabIndex={-1} className="site-root">` with one `<h1 tabIndex={-1}>`, which takes the focus after a navigation (`page-passage.tsx`). The pages under `(site)/(pages)` still wear the CLI version's look: a change that redesigns one takes it out of that group.
- The chrome is dressed by itself, as `site-root site-island`: only a `.site-root` that is not an island changes the colours of the document around it.
- A page or a section enters `src/lib/site/pages.ts` with the screen that makes it exist. Top, menu, foot and search list what is there. What else finds it in the search is in the dictionaries, under `site.search.terms`.
- Links: to a page of the site through `pageLink` and to a section through `SectionLink` (they answer when the visitor is already there, which the router does not; the home restores its own scroll), to the CLI version through `CliLink`, to the other language as a document load (`LanguageLink`). A client navigation between languages replaces `<html>` and loses the CLI version's palette and font.
- What sticks under the top, or stops a scroll there, uses `--site-top`; what stays above the menu at the base, `--site-base`.

## Invariants

- The build and every public page work without a database; each path that reads it checks `dbConfigured` and degrades.
- Every `/admin` page starts with the session check and every Server Action with `requireAdmin()`: no middleware protects `/admin`.
- What the MCP writes is born private. Agents create and move records. The one tool that deletes is `revert_sync_run`, which undoes a closed sync run and asks for explicit confirmation; publishing follows ADR 0005.
- Files that contain personal data are never served from `/uploads`, which is public and cached forever.
- Prisma migrations are additive while the rebranding branch is open: two branches change the schema.
- Every visible string of the public site comes from `src/dictionaries/*.json`, in both locales.
