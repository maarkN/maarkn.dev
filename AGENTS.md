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
- Gates: `pnpm lint` (ESLint, dictionary parity, admin utility guard), `pnpm test`, `pnpm build`. Run the build without `DATABASE_URL`, as CI does.

## Invariants

- The build and every public page work without a database; each path that reads it checks `dbConfigured` and degrades.
- Every `/admin` page starts with the session check and every Server Action with `requireAdmin()`: no middleware protects `/admin`.
- What the MCP writes is born private. Agents create and move records. The one tool that deletes is `revert_sync_run`, which undoes a closed sync run and asks for explicit confirmation; publishing follows ADR 0005.
- Files that contain personal data are never served from `/uploads`, which is public and cached forever.
- Prisma migrations are additive while the rebranding branch is open: two branches change the schema.
- Every visible string of the public site comes from `src/dictionaries/*.json`, in both locales, except the projects' text: the database is its source, in both languages, and the dictionaries only seed it (ADR 0003). A fix to published project copy goes in the backoffice; no script or migration overwrites text that is already in the database.
