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
