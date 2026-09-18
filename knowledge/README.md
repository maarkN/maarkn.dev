# Knowledge base (`knowledge/`)

Source content for the AI features on maarkn.dev:

- the **RAG chat agent** (`/api/chat`) answers from these files, and
- the **CV / job-application generator** (`/admin/generator`) draws on them.

`scripts/ingest-knowledge.ts` (`make ingest` / `pnpm run db:ingest`) reads every
`*.md` under this folder, splits it into ~1,100-char chunks **by Markdown heading**,
embeds each chunk with OpenAI and stores them in the `KnowledgeChunk` table
(pgvector). Ingest is **idempotent** — it wipes the table and re-inserts every run.

## These files are NOT committed

The real content lives only on the server. Everything in this folder **except this
README** is git-ignored, so you copy your files straight onto the EC2 and they
survive every deploy (`git reset --hard` never touches ignored files):

```bash
# from your machine → the repo checkout on the EC2:
scp ./knowledge/cv.md            ubuntu@<EC2_HOST>:~/maarkn.dev/knowledge/
scp -r ./knowledge/projects      ubuntu@<EC2_HOST>:~/maarkn.dev/knowledge/
# then, on the EC2:
make ingest
```

Re-run `make ingest` whenever you change these files.

## Expected structure

```
knowledge/
├── README.md            # this file (the only tracked file)
├── cv.md                # your résumé / CV, in Markdown
└── projects/
    ├── <project>.md     # one dossier per project
    └── ...
```

### `cv.md`

Your CV as Markdown. Use `#` / `##` / `###` headings — each becomes a retrievable
chunk. Suggested sections: `## Summary`, `## Technical skills`,
`## Professional experience`, `## Education`, `## Languages`.

### `projects/<project>.md`

One file per project the chat/generator should know about. Give each section a
heading so it chunks cleanly, e.g.:

```markdown
# ProjectName

## Overview
- **Company**: …
- **Segment / business model**: …
- **Period**: …
- **Your role**: …

## Key features
- …

## Architecture / stack
- …

## Impact / metrics
- …
```

## Visibility: private by default

Every chunk is written as **`private`** unless the file says otherwise. Private
chunks still feed the authenticated CV/cover-letter generator; they are **never**
returned to the anonymous chat at `/chat` — the partition is a `WHERE` clause in
`src/lib/rag.ts`, not an instruction in the prompt.

Make a file public in one of two ways:

- put `visibility: public` in the **first 20 lines** of the file (YAML
  frontmatter or `<!-- visibility: public -->`); or
- list its relative path in `KNOWLEDGE_PUBLIC_SOURCES` (comma-separated;
  defaults to `cv.md`).

Why the default flipped: project dossiers carry the real client name behind the
anonymised slugs used on `/projects` (`fintech-loan-api`,
`carbon-credit-platform`, …), plus framing notes ("kept out of the CV: …"),
internal repo names and unconfirmed metrics. With everything public, a visitor
could simply ask the chat who the client was. Each ingest prints the decision it
made per file, so check the output after adding a file.

## Formatting tips

- **Headings drive chunking**: only `#`, `##`, `###` start a new chunk. Keep
  sections focused; anything over ~1,100 chars is split on blank lines.
- Only `.md` files are ingested; other extensions are ignored.
- The ingester **sanitizes** authoring notes before embedding, so you can keep
  provenance annotations in the source:
  - lines containing `⚠️`, `internal context`, `do not use in cv`, `NDA`, or
    `never mention` are **dropped**;
  - inline tokens `[code]` / `[user]` / `[inference]` (and pt-BR `[código]` /
    `[usuário]` / `[inferência]`) and `_(to be filled)_` / `_(a preencher)_` are
    **stripped**.
