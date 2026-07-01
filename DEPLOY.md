# Deploying maarkn.dev (self-host)

Production stack: **Next.js (standalone) + Postgres/pgvector + Traefik v3.6 (TLS)**,
via `docker-compose.prod.yml`. The Next app lives in `app/` (the git repo root);
run everything from there.

Network topology: Traefik and the app share the public `web` network; the app and
Postgres share a private `internal` network (`internal: true`), so the database is
never reachable from Traefik or the public entrypoints.

## 1. Server prerequisites
- A VPS / EC2 with **Docker + Docker Compose v2**.
- DNS **A record**: `maarkn.dev` → server public IP. Ports **80** and **443** open
  (80 is required even with TLS — it serves the HTTP→HTTPS redirect).
- If the instance has **< 2 GB RAM**, add swap before building on-box (`next build`
  is memory-hungry): see [§8](#8-ci-cd-github-actions).

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
Once CI/CD is set up ([§8](#8-ci-cd-github-actions)) every push to `main` deploys
automatically. To update by hand, SSH in and run:
```bash
git pull
docker compose -f docker-compose.prod.yml run --rm migrate         # apply new migrations
docker compose -f docker-compose.prod.yml up -d --build app         # rebuild + restart
```

## 8. CI/CD (GitHub Actions)
`.github/workflows/deploy.yml` runs on every push to `main`:
1. **CI** (GitHub-hosted runner): `pnpm install` → `pnpm lint` → `pnpm build`.
2. **Deploy** (only if CI passes): SSH into the EC2, `git reset --hard origin/main`,
   apply migrations, then `docker compose up -d --build`. The **build happens on the
   EC2** (this is the "build-on-host" strategy), so the instance needs Docker and
   enough RAM.

### What to do on the EC2 (one-time)
1. **Install Docker + Compose v2** and add your login user to the `docker` group:
   ```bash
   sudo usermod -aG docker "$USER" && newgrp docker
   ```
2. **Clone the repo** where the deploy will run from (this path becomes the
   `EC2_APP_DIR` secret). The repo root already contains `docker-compose.prod.yml`:
   ```bash
   git clone git@github.com:maarkN/maarkn.dev.git ~/maarkn.dev
   ```
   For `git` over SSH to work unattended, add a **read-only GitHub Deploy Key**:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""
   cat ~/.ssh/github_deploy.pub   # -> GitHub repo → Settings → Deploy keys (read-only)
   printf 'Host github.com\n  IdentityFile ~/.ssh/github_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config
   ```
   (Or clone via HTTPS with a PAT — but a deploy key is cleaner.)
3. **Create the SSH key GitHub Actions uses to log in** to the box:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/gh_actions -N ""
   cat ~/.ssh/gh_actions.pub >> ~/.ssh/authorized_keys   # authorize it
   cat ~/.ssh/gh_actions                                 # PRIVATE key → GitHub secret EC2_SSH_KEY
   ```
4. **Create `~/maarkn.dev/.env`** with the production values from [§2](#2-production-env).
5. **Run the first deploy manually** ([§3](#3-database--migrations)–[§6](#6-start-the-app--traefik))
   — seed/ingest are first-time only and are **not** re-run by CI.
6. **Swap** if RAM < 2 GB (so `next build` doesn't OOM on the instance):
   ```bash
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
   sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
7. **Security Group**: inbound **80** + **443** (public), and **22** for the GitHub
   runner. GitHub-hosted runners have dynamic IPs, so either allow 22 from
   `0.0.0.0/0` with **key-only auth** (disable password login, add fail2ban), or use
   a self-hosted runner / AWS SSM tunnel to avoid exposing SSH at all.

### GitHub secrets (repo → Settings → Secrets and variables → Actions)
| Secret | Value |
|---|---|
| `EC2_HOST` | Public IP or DNS of the instance |
| `EC2_USER` | Login user (`ubuntu`, `ec2-user`, …) |
| `EC2_SSH_KEY` | **Private** key from step 3 (`~/.ssh/gh_actions`) |
| `EC2_APP_DIR` | Absolute path to the clone, e.g. `/home/ubuntu/maarkn.dev` |
| `EC2_PORT` | *(optional)* SSH port, defaults to `22` |

The `deploy` job targets a GitHub **Environment** named `production` — create it
under repo → Settings → Environments. Leave it unprotected for auto-deploy, or add
*required reviewers* later if you want a manual approval gate before each release.

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
- The image builds with **pnpm** (via corepack, pinned by `package.json`
  `packageManager`). The deps stage uses `node-linker=hoisted` so the runtime stage
  can copy the Prisma client/engine without pnpm symlinks.
