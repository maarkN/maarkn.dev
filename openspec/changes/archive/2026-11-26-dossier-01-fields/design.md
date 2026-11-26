## Context

Ver proposal.md. Na cópia de produção de 2026-11-26 havia 99 candidaturas, nenhuma com motivo de encerramento em texto, e nenhuma entrevista.

## Goals / Non-Goals

**Goals:** campos e regras do dossiê no banco e no MCP, prontos para as telas de `rebrand-11-admin-screens`.

**Non-Goals:** telas de edição; categorizar motivos antigos.

## Decisions

Aprovadas em 2026-11-26.

- **Sem mapeamento dos motivos antigos.** A tarefa 1.1 falava em "mapeamento inicial", mas a produção não tem nenhum motivo em texto. O texto livre continua guardado ao lado da categoria.
- **Regras para as entrevistas que a 2.2 não cobria.** Data passada sem resultado vira marcada; resultado `cancelled` vira cancelada; resultado sem data fica prevista, porque realizada exige data; resultado com data futura fica marcada. Nenhum resultado é apagado. Na produção, nenhuma linha foi afetada.
- **Dossiê atual só mostra os campos novos.** Specs e tarefa 4.3 pedem que apareçam; a edição é pelo MCP até `rebrand-11-admin-screens`.
- **`list_applications` devolve trechos.** O motivo vem inteiro; o texto da empresa e o do projeto vêm cortados em 500 caracteres, com aviso e o tamanho gravado. O texto inteiro está em `get_application`. Cem textos inteiros ocupariam a maior parte do contexto de quem chama antes de cada upsert.
- **Toda mudança de estágio vira evento**, também a do formulário completo do backoffice e a do `revert_sync_run`, que segue as mesmas regras de motivo e situação.
- **Contexto do projeto se chama `projectInfoMd`**, como as outras colunas; o glossário citava um `project_info` que não existia.

## Risks / Trade-offs

- [O CHECK de situação e data quebra o `db:seed:demo` da `main` num banco já migrado] → Só afeta banco local compartilhado entre branches. Um banco por branch até `feat/rebranding` receber esta change.
- [A máscara de contato roda em texto de terceiros a cada leitura] → Linear: e-mail por scanner, e a listagem mascara só o começo de cada texto.
