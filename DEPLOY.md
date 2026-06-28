# Deploying maarkn.dev (self-host)

Production stack: **Next.js (standalone) + Postgres/pgvector + Traefik (TLS)**, via
`docker-compose.prod.yml`. The Next app lives in `app/`; run everything from there.

## 1. Server prerequisites
- A VPS / EC2 with **Docker + Docker Compose v2**.
- DNS **A record**: `maarkn.dev` → server public IP. Ports **80** and **443** open.

## 2. Production `.env`
Create `app/.env` (next to `docker-compose.prod.yml`):

```dotenv
# --- database ---
POSTGRES_USER=maarkn
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=maarkn
DATABASE_URL=postgresql://maarkn:<strong-random-password>@postgres:5432/maarkn?schema=public

# --- domain / TLS ---
APP_DOMAIN=maarkn.dev
ACME_EMAIL=you@example.com

# --- auth / admin (first login) ---
AUTH_SECRET=<openssl rand -base64 32>
ADMIN_EMAIL=you@maarkn.dev
ADMIN_PASSWORD=<strong-admin-password>

# --- AI (RAG chat + résumé/job generator) ---
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
# OPENAI_GENERATOR_MODEL=gpt-4o   # optional: nicer generator output

# --- optional ---
RESEND_API_KEY=
GHOST_URL=
GHOST_CONTENT_API_KEY=
```

Generate `AUTH_SECRET` with `openssl rand -base64 32`. Use the **same** password in
`POSTGRES_PASSWORD` and inside `DATABASE_URL`.

## 3. Database + migrations
```bash
docker compose -f docker-compose.prod.yml up -d postgres
docker compose -f docker-compose.prod.yml run --rm migrate        # prisma migrate deploy
```

## 4. Seed the admin user (first deploy only)
```bash
docker compose -f docker-compose.prod.yml run --rm --entrypoint sh migrate -c "npm run db:seed"
```
Creates the admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` plus the 8 starter
projects. (If you skip projects, the public site falls back to the built-in list
until you add some in `/admin`.) **Change the admin password after first login.**

## 5. Index the knowledge base (for the AI chat)
```bash
docker compose -f docker-compose.prod.yml run --rm --entrypoint sh migrate -c "npm run db:ingest"
```
Embeds `app/knowledge/**` into pgvector. Re-run whenever you edit `knowledge/`.

## 6. Start the app + Traefik
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Traefik obtains a Let's Encrypt certificate for `APP_DOMAIN` automatically.
- Site: `https://maarkn.dev`
- Admin: `https://maarkn.dev/admin` · Generator: `/admin/generator`

## Updating (new code)
```bash
git pull
docker compose -f docker-compose.prod.yml run --rm migrate         # apply new migrations
docker compose -f docker-compose.prod.yml up -d --build app         # rebuild + restart
```

## Persistence & backups
- **Uploaded images** → `maarkn-uploads` volume (`/data/uploads` in the app).
- **Database** → `maarkn-pg-data` volume. Back both up (`docker run --rm -v ...`).
- The prod Postgres image (`pgvector/pgvector:pg17`) ships the `vector` extension
  natively — no manual install needed.

## Notes
- Local dev uses an isolated pgvector container on host port **5433**
  (`npm run db:up`) + `npm run dev`; the database is `maarkn_website`.
- The slim runtime image has no Prisma CLI / tsx by design — migrations, seed and
  ingest run from the `migrate` service (built from the `builder` stage).
