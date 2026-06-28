# syntax=docker/dockerfile:1
# Multi-stage build for the Next.js 16 standalone server + Prisma client.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# --- deps: install with lockfile (postinstall runs `prisma generate`) ---
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- builder: generate Prisma client + build the standalone server ---
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

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
# Prisma needs the schema, the generated client and the query engine at runtime.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Writable directory for uploaded media (mounted as a named volume in prod).
RUN mkdir -p /data/uploads && chown -R nextjs:nodejs /data
ENV UPLOAD_DIR=/data/uploads

USER nextjs
EXPOSE 5050
CMD ["node", "server.js"]
