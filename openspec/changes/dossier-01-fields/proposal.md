## Why

O dossiê já reúne quase tudo de uma candidatura, mas faltam cinco coisas que Marco precisa ao longo do processo: o que se sabe da empresa, em que produto trabalharia, por que a candidatura acabou, quais etapas do processo ainda virão, e registrar uma entrevista por agente (hoje só se registra um evento dizendo que foi marcada).

## What Changes

- **Empresa:** texto "sobre a empresa", compartilhado por todas as candidaturas dela.
- **Candidatura:** contexto do projeto e motivo de encerramento (categoria, para recusada ou retirada), mantendo o texto livre.
- **Entrevista:** pode existir sem data, com ordem e situação (prevista, marcada, realizada, cancelada).
- **MCP:** `upsert_interview`; campos novos em `upsert_application` e em `company`; `get_application` e `list_applications` os devolvem.

**Fora do escopo:** telas (`rebrand-11-admin-screens`), arquivos (`dossier-02-sent-documents`) e calendário (`agenda-01-google-calendar`).

## Capabilities

### New Capabilities
- `application-dossier`: o que o dossiê de uma candidatura guarda além do funil.
- `interviews`: as etapas do processo seletivo e sua situação.

### Modified Capabilities

## Impact

- `prisma/schema.prisma` e migração, tools MCP de candidatura, `dossier.ts`, `src/lib/applications.ts` (vocabulário), seed de demonstração, glossário.
- **Branch:** main
- **Depende de:** infra-01-pr-checks
