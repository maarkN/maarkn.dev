-- ===========================================================================
-- F2a — CUTOVER: `JobApplication` (plano) -> `Company` + `Job` + `Application`
-- ---------------------------------------------------------------------------
-- Existiam DOIS modelos paralelos de candidatura: o tracker plano
-- `JobApplication` (o que as telas de `/admin/applications` liam) e o modelo
-- normalizado `Application` (vazio, escrito so pelo MCP). Isso nao e
-- redundancia inofensiva: com duas tabelas vivas, qual delas e a verdade passa
-- a depender de por onde o dado entrou — a tela grava numa, a skill do Obsidian
-- na outra, e o painel mostra metade do funil. Esta migration converte o modelo
-- antigo e o REMOVE.
--
-- Regras aplicadas, na ordem:
--   1. uma `Company` por empresa distinta, deduplicada pelo NOME NORMALIZADO
--      (minusculas, sem acento, nao-alfanumerico -> "-"). "Just Eat Takeaway" e
--      "just-eat-takeaway" viram uma linha so. `folderName` recebe esse slug,
--      que e a chave natural que o MCP tambem usa — entao a primeira
--      sincronizacao do vault vai CASAR com estas linhas em vez de duplica-las.
--   2. um `Job` por (empresa, cargo) — na pratica por (empresa, cargo, pais),
--      DESVIO DELIBERADO do enunciado: 6 pares do tracker atual repetem
--      (empresa, cargo) com `role` vazio e paises diferentes (Datadog IE + DE,
--      Stripe, Google, Microsoft, SAP, Databricks). Colapsar por (empresa,
--      cargo) apagaria o pais de um dos dois lados. O discriminador so entra
--      quando o cargo esta vazio, entao "empresa + mesmo cargo" continua
--      compartilhando uma unica vaga, como pedido.
--   3. uma `Application` por linha antiga, com `folderName` derivado
--      (`<empresa>--<cargo|pais|vaga>`) e desambiguado por sufixo `-2`, `-3`...
--      quando colidir. NUNCA nulo, NUNCA duplicado: e a chave de dedupe do MCP,
--      e sem ela o guard-rail contra o agente duplicar registro e decorativo.
--   4. `status` (6 valores da aplicacao) -> `funnel_stage` (enum nativo).
--   5. `appliedAt`, `followUp`, `notes`, `fit` e `source` preservados campo a
--      campo (`followUp`/`fit` ganham coluna nova; nada vai para dentro de uma
--      nota generica).
--
-- POR QUE DROPAR EM VEZ DE RENOMEAR PARA BACKUP: uma tabela `JobApplication_old`
-- parada no banco e um convite a um segundo caminho de leitura voltar a existir
-- — foi exatamente assim que o modelo duplo nasceu. O dado nao se perde: cada
-- linha antiga e gravada INTEIRA (todas as colunas, em JSON) em
-- `Provenance.after`, com `entityType = 'Application'`, `entityId` da linha
-- nova e `mcpTool = 'migration:application_cutover'`. Isso e mais util que a
-- tabela de backup: ja vem correlacionado com o registro resultante, e usa o
-- mesmo mecanismo de auditoria/rollback do resto do sistema.
--   Conferir depois:  SELECT after FROM "Provenance"
--                     WHERE "mcpTool" = 'migration:application_cutover';
-- ===========================================================================

-- --------------------------------------------------------------------------
-- 0) Colunas novas em `Application` (preservacao de `fit` e `followUp`).
-- --------------------------------------------------------------------------
ALTER TABLE "Application" ADD COLUMN "fit" TEXT;
ALTER TABLE "Application" ADD COLUMN "followUp" TEXT;

-- --------------------------------------------------------------------------
-- 1) Helpers. Criados no schema publico e DROPADOS no fim da migration —
--    `pg_temp` nao e confiavel aqui porque nao ha garantia de que o arquivo
--    inteiro rode na mesma sessao em toda versao do motor de migration.
-- --------------------------------------------------------------------------

-- Slug ASCII deterministico. A extensao `unaccent` NAO esta instalada (o
-- schema declara apenas `vector`), e instalar uma extensao so para isto exigiria
-- superusuario no Postgres de producao — que roda em rede `internal: true`.
-- `translate` cobre a acentuacao latina que aparece de fato nos dados.
CREATE FUNCTION "__f2a_slug"(input TEXT) RETURNS TEXT AS $$
  SELECT COALESCE(
    NULLIF(
      btrim(
        regexp_replace(
          lower(
            translate(
              COALESCE(input, ''),
              'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÝÇÑáàâãäåéèêëíìîïóòôõöúùûüýÿçñ',
              'AAAAAAEEEEIIIIOOOOOUUUUYCNaaaaaaeeeeiiiiooooouuuuyycn'
            )
          ),
          '[^a-z0-9]+', '-', 'g'
        ),
        '-'
      ),
      ''
    ),
    'sem-nome'
  );
$$ LANGUAGE sql IMMUTABLE;

-- Id textual para as linhas criadas aqui. Nao da para usar `@default(cuid())`:
-- o cuid do Prisma e gerado no cliente, a coluna nao tem default no banco. O
-- prefixo deixa obvio, num `SELECT` futuro, o que nasceu deste cutover.
CREATE FUNCTION "__f2a_id"(prefix TEXT) RETURNS TEXT AS $$
  SELECT prefix || '_' || replace(gen_random_uuid()::text, '-', '');
$$ LANGUAGE sql VOLATILE;

-- --------------------------------------------------------------------------
-- 2) Conversao linha a linha.
-- --------------------------------------------------------------------------
DO $cutover$
DECLARE
  r                "JobApplication"%ROWTYPE;
  company_key      TEXT;
  comp_id          TEXT;
  role_title       TEXT;
  discriminator    TEXT;
  folder_base      TEXT;
  folder           TEXT;
  job_src_base     TEXT;
  job_src          TEXT;
  job_id           TEXT;
  job_comp         TEXT;
  app_id           TEXT;
  stage_val        "funnel_stage";
  sponsorship_val  "sponsorship_signal";
  careers          TEXT;
  n                INT;
  n_apps           INT := 0;
  n_companies      INT := 0;
  n_jobs           INT := 0;
BEGIN
  FOR r IN
    SELECT * FROM "JobApplication" ORDER BY "createdAt" ASC, "id" ASC
  LOOP
    careers    := NULLIF(btrim(COALESCE(r."careersUrl", '')), '');
    role_title := NULLIF(btrim(COALESCE(r."role", '')), '');

    -- ---- 2.1 empresa (dedupe por nome normalizado) -----------------------
    company_key := "__f2a_slug"(r."company");
    SELECT c."id" INTO comp_id FROM "Company" c WHERE c."folderName" = company_key;

    IF comp_id IS NULL THEN
      comp_id := "__f2a_id"('cmp');
      INSERT INTO "Company" (
        "id", "folderName", "name", "careersUrl", "country", "city", "market",
        "visibility", "sourcePath", "lastMcpTool", "lastSeenAt",
        "createdAt", "updatedAt"
      ) VALUES (
        comp_id, company_key, btrim(r."company"), careers,
        NULLIF(btrim(COALESCE(r."country", '')), ''),
        NULLIF(btrim(COALESCE(r."city", '')), ''),
        NULLIF(btrim(COALESCE(r."country", '')), ''),
        'private', 'legacy://JobApplication/' || r."id",
        'migration:application_cutover', now(),
        r."createdAt", now()
      );
      n_companies := n_companies + 1;
    ELSE
      -- Nao sobrescreve o que ja existe (a linha pode ter vindo do MCP, que e
      -- fonte melhor); so preenche buraco.
      UPDATE "Company" SET
        "careersUrl" = COALESCE("careersUrl", careers),
        "country"    = COALESCE("country", NULLIF(btrim(COALESCE(r."country", '')), '')),
        "city"       = COALESCE("city", NULLIF(btrim(COALESCE(r."city", '')), '')),
        "market"     = COALESCE("market", NULLIF(btrim(COALESCE(r."country", '')), '')),
        "updatedAt"  = now()
      WHERE "id" = comp_id;
    END IF;

    -- ---- 2.2 vaga --------------------------------------------------------
    -- Discriminador: cargo quando existe; senao o pais; senao "vaga".
    discriminator := COALESCE(
      role_title,
      NULLIF(btrim(COALESCE(r."country", '')), ''),
      'vaga'
    );
    folder_base := company_key || '--' || "__f2a_slug"(discriminator);

    sponsorship_val := CASE
      -- `sponsorsVisa = true` e uma afirmacao do usuario ("esta empresa
      -- patrocina") -> `explicit_support`. `false` NAO significa "nao
      -- patrocina": no tracker antigo era so a ausencia da marcacao -> `silent`
      -- (desconhecido). Mapear para `explicit_no_sponsorship` inventaria um
      -- fato eliminatorio que ninguem verificou.
      WHEN r."sponsorsVisa" THEN 'explicit_support'
      ELSE 'silent'
    END::"sponsorship_signal";

    -- Chave natural da vaga: a URL da vaga quando existe; senao a URL de
    -- carreiras + fragmento do discriminador (a mesma pagina de carreiras
    -- serve varias vagas, entao a URL crua nao e chave); senao um URI
    -- sintetico `legacy://`, que a skill do vault vai substituir quando
    -- encontrar a vaga real.
    job_src_base := COALESCE(
      NULLIF(btrim(COALESCE(r."jobUrl", '')), ''),
      CASE WHEN careers IS NOT NULL
           THEN careers || '#' || "__f2a_slug"(discriminator)
           ELSE 'legacy://job/' || folder_base
      END
    );

    n := 1;
    job_src := job_src_base;
    LOOP
      SELECT j."id", j."companyId" INTO job_id, job_comp
        FROM "Job" j WHERE j."sourceUrl" = job_src;
      EXIT WHEN job_id IS NULL;                          -- livre: cria
      EXIT WHEN job_comp IS NOT DISTINCT FROM comp_id;   -- mesma empresa: reusa
      n := n + 1;                                        -- colisao entre empresas
      job_src := job_src_base || '#' || n::text;
    END LOOP;

    IF job_id IS NULL THEN
      job_id := "__f2a_id"('job');
      INSERT INTO "Job" (
        "id", "sourceUrl", "companyId", "title", "market", "locationText",
        "sponsorship", "salaryText", "active", "visibility", "sourcePath",
        "lastMcpTool", "lastSeenAt", "createdAt", "updatedAt"
      ) VALUES (
        job_id, job_src, comp_id,
        COALESCE(role_title, 'Cargo a definir'),
        NULLIF(btrim(COALESCE(r."country", '')), ''),
        NULLIF(concat_ws(', ',
          NULLIF(btrim(COALESCE(r."city", '')), ''),
          NULLIF(btrim(COALESCE(r."country", '')), '')
        ), ''),
        sponsorship_val,
        NULLIF(btrim(COALESCE(r."targetSalary", '')), ''),
        TRUE, 'private', 'legacy://JobApplication/' || r."id",
        'migration:application_cutover', now(), r."createdAt", now()
      );
      n_jobs := n_jobs + 1;
    ELSE
      UPDATE "Job" SET
        "salaryText" = COALESCE("salaryText", NULLIF(btrim(COALESCE(r."targetSalary", '')), '')),
        -- So promove o sinal: `silent` -> `explicit_support` sim; o contrario
        -- nao (uma linha marcada como patrocinadora nao volta a desconhecida).
        "sponsorship" = CASE
          WHEN sponsorship_val = 'explicit_support'::"sponsorship_signal"
            THEN sponsorship_val ELSE "sponsorship"
        END,
        "updatedAt" = now()
      WHERE "id" = job_id;
    END IF;

    -- ---- 2.3 candidatura -------------------------------------------------
    folder := folder_base;
    n := 1;
    LOOP
      PERFORM 1 FROM "Application" a WHERE a."folderName" = folder;
      EXIT WHEN NOT FOUND;
      n := n + 1;
      folder := folder_base || '-' || n::text;
    END LOOP;

    stage_val := CASE r."status"
      -- `not_applied` era "empresa na mira, nada preparado" — isso e `radar`,
      -- nao `ready`. `ready` no vocabulario do vault significa PACOTE PRONTO
      -- para enviar, e nenhuma destas linhas tem pacote.
      WHEN 'not_applied' THEN 'radar'
      WHEN 'applied'     THEN 'applied'
      -- "houve resposta" e contato de recrutador; `screening` implicaria uma
      -- etapa formal de triagem que o campo antigo nao afirma.
      WHEN 'replied'     THEN 'recruiter_contact'
      WHEN 'interview'   THEN 'interview'
      WHEN 'offer'       THEN 'offer'
      WHEN 'rejected'    THEN 'rejected'
      ELSE 'radar'
    END::"funnel_stage";

    app_id := "__f2a_id"('app');
    INSERT INTO "Application" (
      "id", "folderName", "jobId", "companyId", "stage", "roleTitle", "market",
      "source", "fit", "followUp", "appliedAt", "targetSalary", "notesMd",
      "legacyJobApplicationId", "visibility", "sourcePath", "lastMcpTool",
      "lastSeenAt", "createdAt", "updatedAt"
    ) VALUES (
      app_id, folder, job_id, comp_id, stage_val, role_title,
      NULLIF(btrim(COALESCE(r."country", '')), ''),
      NULLIF(btrim(COALESCE(r."source", '')), ''),
      NULLIF(btrim(COALESCE(r."fit", '')), ''),
      NULLIF(btrim(COALESCE(r."followUp", '')), ''),
      r."appliedAt",
      NULLIF(btrim(COALESCE(r."targetSalary", '')), ''),
      NULLIF(btrim(COALESCE(r."notes", '')), ''),
      r."id", 'private', 'legacy://JobApplication/' || r."id",
      'migration:application_cutover', now(), r."createdAt", r."updatedAt"
    );
    n_apps := n_apps + 1;

    -- ---- 2.4 proveniencia: o registro antigo INTEIRO, em JSON ------------
    INSERT INTO "Provenance" (
      "id", "entityType", "entityId", "sourcePath", "mcpTool",
      "before", "after", "recordedAt"
    ) VALUES (
      "__f2a_id"('prv'), 'Application', app_id,
      'legacy://JobApplication/' || r."id",
      'migration:application_cutover',
      NULL, to_jsonb(r), now()
    );

    -- ---- 2.5 evento: a candidatura ja enviada tem uma data real ----------
    -- Sem isto, `appliedAt` viraria um campo solto e a linha do tempo da
    -- candidatura nasceria vazia justamente nas linhas que ja andaram.
    IF r."appliedAt" IS NOT NULL THEN
      INSERT INTO "ApplicationEvent" (
        "id", "applicationId", "occurredAt", "type", "direction", "toStage",
        "subject", "visibility", "sourcePath", "lastMcpTool", "createdAt"
      ) VALUES (
        "__f2a_id"('evt'), app_id, r."appliedAt", 'stage_change', 'outbound',
        stage_val, 'Candidatura enviada (importado do tracker antigo)',
        'private', 'legacy://JobApplication/' || r."id",
        'migration:application_cutover', now()
      );
    END IF;
  END LOOP;

  RAISE NOTICE '[cutover] % candidatura(s), % empresa(s) nova(s), % vaga(s) nova(s)',
    n_apps, n_companies, n_jobs;
END
$cutover$;

-- --------------------------------------------------------------------------
-- 3) Verificacao dura: a chave natural nao pode ficar nula nem duplicada.
--    Se algo acima falhar silenciosamente, a migration ABORTA aqui — melhor
--    que descobrir com o painel no ar.
-- --------------------------------------------------------------------------
DO $verify$
DECLARE
  legacy_count INT;
  moved_count  INT;
  bad_keys     INT;
BEGIN
  SELECT count(*) INTO legacy_count FROM "JobApplication";
  SELECT count(*) INTO moved_count  FROM "Application" WHERE "legacyJobApplicationId" IS NOT NULL;
  IF legacy_count <> moved_count THEN
    RAISE EXCEPTION 'cutover incompleto: % linha(s) antiga(s), % migrada(s)', legacy_count, moved_count;
  END IF;

  SELECT count(*) INTO bad_keys FROM "Application"
   WHERE "folderName" IS NULL OR btrim("folderName") = '';
  IF bad_keys > 0 THEN
    RAISE EXCEPTION 'cutover invalido: % candidatura(s) sem folderName', bad_keys;
  END IF;
END
$verify$;

-- --------------------------------------------------------------------------
-- 4) Fim do modelo duplo.
-- --------------------------------------------------------------------------
DROP TABLE "JobApplication";

DROP FUNCTION "__f2a_slug"(TEXT);
DROP FUNCTION "__f2a_id"(TEXT);
