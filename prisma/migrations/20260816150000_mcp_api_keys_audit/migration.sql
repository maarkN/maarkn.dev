-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpAuditLog" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "keyPrefix" TEXT,
    "tool" TEXT NOT NULL,
    "argsSummary" TEXT,
    "result" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "reason" TEXT,
    "latencyMs" INTEGER,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "McpAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpRateLimit" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "ApiKey_revokedAt_idx" ON "ApiKey"("revokedAt");

-- CreateIndex
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");

-- CreateIndex
CREATE INDEX "McpAuditLog_apiKeyId_createdAt_idx" ON "McpAuditLog"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "McpAuditLog_status_createdAt_idx" ON "McpAuditLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "McpAuditLog_tool_createdAt_idx" ON "McpAuditLog"("tool", "createdAt");

-- CreateIndex
CREATE INDEX "McpAuditLog_createdAt_idx" ON "McpAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "McpRateLimit_expiresAt_idx" ON "McpRateLimit"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "McpRateLimit_bucket_windowStart_key" ON "McpRateLimit"("bucket", "windowStart");

-- AddForeignKey
ALTER TABLE "McpAuditLog" ADD CONSTRAINT "McpAuditLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- F3a — enforcement por SCHEMA (escrito a mao, nao gerado pelo Prisma)
-- ---------------------------------------------------------------------------
-- Prisma nao expressa CHECK constraint. As regras abaixo existem porque a
-- superficie do MCP e a mais perigosa do projeto e o repositorio e PUBLICO:
-- o atacante le o codigo do guard antes de tentar qualquer coisa. Um bug de
-- aplicacao (ou um agente futuro "simplificando" o codigo) nao pode conseguir
-- gravar uma chave sem escopo nem um hash em formato inesperado.
-- Prisma ignora CHECKs na deteccao de drift, entao eles sobrevivem a
-- `migrate dev` seguintes.

-- Uma chave sem nenhum escopo seria uma chave que autentica mas nao pode
-- fazer nada — na pratica, um convite a "so relaxar o guard depois".
-- `cardinality`, nao `array_length`: para um array vazio `array_length(x, 1)`
-- devolve NULL, e `NULL >= 1` e NULL — que o Postgres trata como CHECK
-- SATISFEITO. A versao ingenua deste constraint deixa passar `scopes = '{}'`.
ALTER TABLE "ApiKey"
  ADD CONSTRAINT "ApiKey_scopes_not_empty"
  CHECK (cardinality("scopes") >= 1);

-- O hash e sempre HMAC-SHA256 em hex minusculo (64 chars). Se alguem tentar
-- gravar a chave em claro (que comeca com 'mk_live_' e tem outro tamanho), o
-- INSERT falha em vez de vazar silenciosamente.
ALTER TABLE "ApiKey"
  ADD CONSTRAINT "ApiKey_keyHash_is_sha256_hex"
  CHECK ("keyHash" ~ '^[0-9a-f]{64}$');

-- O prefixo e publico por construcao; garantir o formato impede que alguem
-- guarde o token inteiro nesta coluna "so para facilitar a UI".
ALTER TABLE "ApiKey"
  ADD CONSTRAINT "ApiKey_keyPrefix_format"
  CHECK ("keyPrefix" ~ '^mk_(live|test)_[A-Za-z0-9_-]{8}$');

ALTER TABLE "McpAuditLog"
  ADD CONSTRAINT "McpAuditLog_status_enum"
  CHECK ("status" IN ('running', 'ok', 'error', 'denied'));

ALTER TABLE "McpAuditLog"
  ADD CONSTRAINT "McpAuditLog_latency_non_negative"
  CHECK ("latencyMs" IS NULL OR "latencyMs" >= 0);

ALTER TABLE "McpRateLimit"
  ADD CONSTRAINT "McpRateLimit_count_non_negative"
  CHECK ("count" >= 0);
