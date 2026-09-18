-- F7 / lente de EXFILTRACAO — despublica o corpus curado que nao se declarou publico.
--
-- Contexto: ate agora `scripts/ingest-knowledge.ts` gravava TODO arquivo de
-- `knowledge/**` com `visibility = 'public'`. Isso colocava os dossies de
-- projeto (nome real do cliente, notas de enquadramento, metricas nao
-- confirmadas) no mesmo indice que o chat ANONIMO do site consulta. Como o site
-- publica esses projetos com nome anonimizado (`fintech-loan-api`,
-- `carbon-credit-platform`, `drug-leaflet-platform`, ...), bastava perguntar ao
-- chat quem foi o cliente para desfazer a anonimizacao — a unica barreira era
-- uma frase no system prompt, que o modelo contorna.
--
-- O ingester agora decide a visibilidade por arquivo (private por default;
-- public so com `visibility: public` no cabecalho do arquivo ou via
-- KNOWLEDGE_PUBLIC_SOURCES). Esta migration alinha as linhas que JA estao no
-- banco — inclusive em producao, onde uma reingestao pode demorar a acontecer.
--
-- Escopo: apenas o corpus deste script (`entityType IS NULL`). Chunks escritos
-- pelo MCP ja nascem `private` e nao sao tocados. `cv.md` permanece publico:
-- e o default de KNOWLEDGE_PUBLIC_SOURCES e material que ja circula em aberto.
UPDATE "KnowledgeChunk"
SET "visibility" = 'private'
WHERE "entityType" IS NULL
  AND "source" <> 'cv.md';
