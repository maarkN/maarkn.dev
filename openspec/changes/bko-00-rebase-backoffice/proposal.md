## Why

O backoffice (F0–F3: candidaturas normalizadas, dossiê, funil Kanban, radar de vagas, contatos, servidor MCP, auditoria, chaves de API) foi construído sobre `f61396e`, antes do redesign de terminal. Ele existe só na branch `feat/backoffice-f0-f3` (commit `00969f1`, 152 arquivos) e nunca foi para a `main`.

Enquanto isso, a `main` recebeu as 15 changes do redesign, que trocaram a paleta por Dracula, apagaram os tokens legados do `globals.css` e moveram os aliases do admin para `admin.css`. Dezesseis arquivos foram tocados pelos dois lados.

Nenhuma das changes de estilo abaixo pode começar antes dessa reconciliação: elas descrevem telas que hoje não existem na `main`.

## What Changes

- Rebase de `feat/backoffice-f0-f3` sobre a `main` atual, resolvendo os 16 conflitos.
- Regra de resolução: o **redesign vence na camada de tema**, o **backoffice vence na camada de dados e telas**.
- O bloco de tokens shadcn que a F0a acrescentou ao `globals.css` é descartado ali e reconstruído em `admin.css` pela change 01 — não sobrevive ao rebase como está.
- Verificação de que o cutover de `JobApplication` e as 6 migrations do backoffice continuam aplicáveis sobre o schema da `main`.

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
<!-- nenhuma -->

`skip_specs: true` — reconciliação de histórico. Nenhum comportamento novo: o backoffice já tem suas próprias specs implícitas nos PRDs e o redesign já está especificado nas 15 changes arquivadas. O que muda de comportamento visual está nas changes 01–05.

## Impact

- Os 16 arquivos em conflito: `.env.example`, `docker-compose.prod.yml`, `package.json`, `pnpm-lock.yaml`, `src/app/globals.css`, `src/app/admin/{layout,page}.tsx`, `src/app/admin/{applications,chat}/page.tsx`, `src/components/admin/{application-form,applications-table,generator-form,login-form,logout-button,project-form}.tsx`, `src/lib/applications.ts`.
- Bloqueia as changes 01–05.
- Risco de dados: nenhum. O rebase não toca em banco; as migrations do backoffice são aditivas sobre o schema da `main`, que não mudou desde `f61396e`.
