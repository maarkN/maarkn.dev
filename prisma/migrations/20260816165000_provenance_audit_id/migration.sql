-- ===========================================================================
-- F2a — `Provenance.auditId`: correlacao escrita <-> chamada de MCP
-- ---------------------------------------------------------------------------
-- Bloqueador reportado pelo F3b: `Provenance` guardava `mcpTool` e `apiKeyId`,
-- mas nao o id da linha de `McpAuditLog`. Com isso, dada uma escrita suspeita,
-- nao havia como chegar na chamada que a produziu — so a um par (tool, chave)
-- que pode se repetir centenas de vezes numa unica rodada. O caminho inverso
-- (auditoria -> fatos escritos) tambem nao existia: `argsSummary` e redigido e
-- truncado de proposito, entao ele nao diz o que entrou no banco.
--
-- Sem FK de proposito:
--   * `McpAuditLog` e escrito ANTES da tool executar e e retencao operacional
--     (expurgavel). Uma FK com `ON DELETE RESTRICT` transformaria expurgo de
--     auditoria em erro; com `SET NULL`, apagaria justamente a correlacao que
--     esta coluna existe para guardar, sem deixar rastro de que existia.
--   * `Provenance.apiKeyId` e `syncRunId` ja seguem a mesma politica no
--     restante do schema (colunas soltas, integridade por convencao).
--
-- Nulo e legitimo: fato que nao veio do MCP (a migration de cutover do
-- `JobApplication`, um backfill manual) nao tem linha de auditoria.
-- ===========================================================================

ALTER TABLE "Provenance" ADD COLUMN "auditId" TEXT;

CREATE INDEX "Provenance_auditId_idx" ON "Provenance"("auditId");
