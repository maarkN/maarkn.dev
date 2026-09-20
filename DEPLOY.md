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

# --- AI (the terminal's `ask` command + résumé/job generator) ---
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
# OPENAI_GENERATOR_MODEL=gpt-4o   # optional: nicer generator output
# CHAT_RATE_MAX=10                # optional: `ask` messages per visitor per window
# CHAT_RATE_WINDOW_MS=3600000     # optional: that window (1 h)
# CHAT_DAILY_MAX=300              # optional: `ask` messages per day, site-wide
CHAT_IP_SALT=<openssl rand -base64 32>   # strongly recommended: see the note below

# --- client IP behind the proxy (the key of every per-IP limit) ---
# TRUSTED_PROXY_HOPS=1            # optional: trusted proxies in front (default 1)
# LOGIN_TRUSTED_PROXY_HOPS=1      # optional: login-only override of the line above

# --- terminal (build-time; see the note below) ---
NEXT_PUBLIC_TERMINAL_ASK_FALLBACK=false

# --- optional ---
RESEND_API_KEY=
GHOST_URL=
GHOST_CONTENT_API_KEY=
```

`NEXT_PUBLIC_TERMINAL_ASK_FALLBACK` (`true` forwards unknown terminal input with
three or more words to the AI assistant) is a **build-time** value: Next inlines
`NEXT_PUBLIC_*` into the client bundle, and `.env` is not part of the Docker build
context. `docker-compose.prod.yml` forwards it to the image as a build arg, so it
takes effect on the next `up --build`, not on a restart. Leave it `false` unless
you want typos to spend the assistant's quota.

Generate `AUTH_SECRET` with `openssl rand -base64 32`. Use the **same** password in
`POSTGRES_PASSWORD` and inside `DATABASE_URL`.

`CHAT_IP_SALT` (min. 16 chars) is the salt of the HMAC that pseudonymises the chat
visitor's IP — the raw IP is never written to the database. **Leaving it out does
not fail the deploy**, and that is the point to watch: the app logs a single
warning and falls back to a random per-process salt, so the hashes stop being
comparable across restarts and across workers. The per-visitor limit
(`CHAT_RATE_MAX`) then resets on every restart and every `up --build`, each worker
counts its own, and `/admin` stops grouping one visitor's sessions; only
`CHAT_DAILY_MAX`, which does not depend on the hash, still caps the spend. Set it
once and keep it — rotating it re-pseudonymises everyone (old rows stop matching
new ones), which is also the emergency move if the salt leaks.

`TRUSTED_PROXY_HOPS` is a property of **this topology**, not of the code. Every
per-IP limit (the login throttle, the pre-auth 60/min on `/api/mcp`) keys on the
IP taken from the *last* trusted `X-Forwarded-For` hop; the leftmost element is
written by the client, and using it would give an attacker a fresh bucket per
request. With the stack above there is exactly one trusted hop (Traefik, the only
thing that can reach the app container — it does not publish a port), so the
default `1` is correct and the variable can stay unset. If you ever put a
CDN/WAF in front of Traefik, raise it to `2` **in the same change**, or those
limits quietly stop limiting. `LOGIN_TRUSTED_PROXY_HOPS` overrides it for the
login path only and falls back to `TRUSTED_PROXY_HOPS`, then to `1`.

Everything else the app reads at runtime — including the `/api/mcp` variables
(`MCP_KEY_PEPPER`, `MCP_ALLOWED_ORIGINS`, the `MCP_RATE_*` limits,
`MCP_MAX_BODY_BYTES`, `MCP_MAX_BATCH_MESSAGES`) — is documented in
`app/.env.example`.

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

## 5. Index the knowledge base (for the terminal's `ask` command)
```bash
docker compose -f docker-compose.prod.yml run --rm --entrypoint sh migrate -c "npm run db:ingest"
```
Embeds `app/knowledge/**` into pgvector — what `ask` and the admin generator answer from. Re-run whenever you edit `knowledge/`.

## 6. Start the app + Traefik
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Traefik obtains a Let's Encrypt certificate for `APP_DOMAIN` automatically.
- Site: `https://maarkn.dev` (the terminal; `?cmd=projects` deep-links work)
- Admin: `https://maarkn.dev/admin` · Generator: `/admin/generator` · Chat log: `/admin/chat`

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
- **Fonts.** The site is monospace only: Cascadia Code comes from Google Fonts
  through `next/font/google` and is **downloaded by the builder stage at build
  time** (the build host needs outbound HTTPS; there is no runtime request to
  Google). DaddyTimeMono is self-hosted from `src/app/fonts/` via
  `next/font/local`. Both end up in `.next/static/media`, which the Dockerfile
  already copies next to `public/` — there is no `public/fonts` folder to mount
  or copy.
- Local dev uses an isolated pgvector container on host port **5433**
  (`npm run db:up`) + `npm run dev`; the database is `maarkn_website`.
- The slim runtime image has no Prisma CLI / tsx by design — migrations, seed and
  ingest run from the `migrate` service (built from the `builder` stage).
- The image builds with **pnpm** (via corepack, pinned by `package.json`
  `packageManager`). The deps stage uses `node-linker=hoisted` so the runtime stage
  can copy the Prisma client/engine without pnpm symlinks.
