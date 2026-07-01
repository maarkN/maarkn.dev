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
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma needs the schema + the generated client & query engine at runtime.
# Copy the whole node_modules from the builder (over the standalone's traced
# subset): with pnpm the client/engine sit behind .pnpm symlinks that a
# cherry-picked COPY can't resolve, and Next's tracer doesn't bundle the engine.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Writable directory for uploaded media (mounted as a named volume in prod).
RUN mkdir -p /data/uploads && chown -R nextjs:nodejs /data
ENV UPLOAD_DIR=/data/uploads

USER nextjs
EXPOSE 5050
CMD ["node", "server.js"]
