# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js 16 standalone server + Prisma client.
# Package manager: pnpm (via corepack), pinned by package.json#packageManager.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
# corepack provisions the pnpm@11.x declared in package.json; upgrade it first so
# the bundled keyring can verify recent pnpm releases (avoids the "keyid" error).
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN npm install -g corepack@latest && corepack enable
WORKDIR /app

# --- deps: install with frozen lockfile (postinstall runs `prisma generate`) ---
FROM base AS deps
# pnpm-workspace.yaml carries the build-script approvals (Prisma engine, sharp);
# without it those postinstalls are skipped and the runtime crashes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
# node-linker=hoisted gives a flat, npm-style node_modules so the runner stage can
# cherry-pick the Prisma client/engine below without chasing pnpm symlinks.
RUN printf 'node-linker=hoisted\n' > .npmrc \
    && pnpm install --frozen-lockfile

# --- builder: generate Prisma client + build the standalone server ---
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined into the client bundle at build time, and
# .env is not part of the build context, so the terminal's ask fallback flag
# comes in as a build arg (docker-compose.prod.yml forwards it from .env).
ARG NEXT_PUBLIC_TERMINAL_ASK_FALLBACK=false
ENV NEXT_PUBLIC_TERMINAL_ASK_FALLBACK=$NEXT_PUBLIC_TERMINAL_ASK_FALLBACK
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate
RUN pnpm run build

# --- runner: minimal runtime image ---
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5050
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# .next/static also carries the fonts next/font emitted at build time: Cascadia
# Code (fetched from Google Fonts by the builder) and the self-hosted
# DaddyTimeMono from src/app/fonts/.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma needs the schema + the generated client & query engine at runtime.
# Copy the whole node_modules from the builder (over the standalone's traced
# subset): with pnpm the client/engine sit behind .pnpm symlinks that a
# cherry-picked COPY can't resolve, and Next's tracer doesn't bundle the engine.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# `.next/standalone` is a copy of the project root that Next's file tracer
# produced, so it drags in everything the runtime has no business holding:
#  - knowledge/ is the private corpus (CV, project dossiers). It is only needed
#    by `db:ingest`, which runs from the `builder` stage (see the `migrate`
#    service in docker-compose.prod.yml), never by `server.js`. It stays in the
#    build context on purpose -- it is deleted here instead.
#  - .env would be the whole production secret set sitting in the image. Today
#    only a line in .dockerignore keeps it out of the build context; this rm is
#    the second lock, so a change to .dockerignore cannot silently bake it in.
#  - the rest is documentation and compose/Dockerfile sources.
# NOT removed: src/, which `src/lib/og.tsx` reads at runtime (the Cascadia Code
# subsets under src/app/fonts/ are loaded from process.cwd() for OG images).
RUN rm -rf ./knowledge ./docs ./openspec ./.claude \
    && rm -f ./.env ./.env.* ./*.md ./Dockerfile ./docker-compose*.yml

# Writable directory for uploaded media (mounted as a named volume in prod).
RUN mkdir -p /data/uploads && chown -R nextjs:nodejs /data
ENV UPLOAD_DIR=/data/uploads

USER nextjs
EXPOSE 5050
CMD ["node", "server.js"]
