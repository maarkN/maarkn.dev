-- ===========================================================================
-- F1-verify — fechamento dos buracos de dedupe deixados por `backoffice_core`
-- ---------------------------------------------------------------------------
-- Achado do verificador adversarial: no Postgres, um UNIQUE composto NAO
-- deduplica quando qualquer coluna da chave e NULL (dois NULLs sao
-- considerados distintos). Quatro chaves compostas do contrato F1 -> F3
-- comecam por uma coluna nullable, entao a segunda insercao PASSAVA:
--
--   Contact(companyId, name)                      -- companyId NULL
--   ScreeningQuestion(applicationId, orderIndex)  -- applicationId NULL
--   RequirementCoverage(applicationId, requirementKey)
--   ChecklistItem(applicationId, orderIndex)
--
-- Isso importa porque `ScreeningQuestion` e `RequirementCoverage` tem um caso
-- legitimo de `applicationId IS NULL` (matriz/triagem no nivel da VAGA, com
-- `jobId` preenchido) — ou seja, o caminho sem dedupe nao e teorico: e o
-- caminho que a sincronizacao do radar percorre. Reprocessar o mesmo arquivo
-- do vault duplicaria essas linhas a cada rodada, violando o criterio de
-- aceite do F3 ("sincronizar duas vezes nao cria uma linha a mais").
--
-- Prisma nao expressa indice UNIQUE parcial; como acontece com os CHECKs de
-- `backoffice_core`, este bloco e escrito a mao e sobrevive a `migrate dev`
-- futuros (verificado: `prisma migrate diff` reporta "empty migration").
-- ===========================================================================

-- 1) ChecklistItem: item sem candidatura nao existe no vault, e com a coluna
--    nullable o @@unique([applicationId, orderIndex]) era decorativo.
DELETE FROM "ChecklistItem" WHERE "applicationId" IS NULL;

ALTER TABLE "ChecklistItem" ALTER COLUMN "applicationId" SET NOT NULL;

-- 2) ScreeningQuestion no nivel da vaga (applicationId NULL, jobId preenchido).
CREATE UNIQUE INDEX "ScreeningQuestion_jobId_orderIndex_key"
  ON "ScreeningQuestion" ("jobId", "orderIndex")
  WHERE "applicationId" IS NULL;

-- 3) RequirementCoverage no nivel da vaga (matriz requisito x evidencia sem
--    candidatura aberta ainda).
CREATE UNIQUE INDEX "RequirementCoverage_jobId_requirementKey_key"
  ON "RequirementCoverage" ("jobId", "requirementKey")
  WHERE "applicationId" IS NULL;

-- 4) Contact sem empresa: recrutador que aparece so na pasta da candidatura,
--    ou contato solto (referral). Dois indices parciais porque o segundo nivel
--    (`applicationId`) tambem e nullable.
CREATE UNIQUE INDEX "Contact_applicationId_name_key"
  ON "Contact" ("applicationId", "name")
  WHERE "companyId" IS NULL;

CREATE UNIQUE INDEX "Contact_name_orphan_key"
  ON "Contact" ("name")
  WHERE "companyId" IS NULL AND "applicationId" IS NULL;
