## Why

Marco acompanha entrevistas em dois lugares: o backoffice e o Google Calendar. Falta ver a semana ao lado do funil e marcar uma entrevista sem sair dele, inclusive por agente.

## What Changes

- Conexão OAuth de uma conta Google, com escolha dos calendários a exibir (ADR 0004).
- Leitura ao vivo dos compromissos; nada de agenda pessoal é copiado para o banco.
- Escrita só no calendário "Entrevistas", sem participantes e sem convites.
- Entrevista marcada cria o compromisso; mudança ou exclusão no Google se reflete na próxima leitura.
- Escopos MCP `calendar:read` e `calendar:write`, e as tools `list_calendar`, `schedule_interview` e `unschedule_interview`.

**Fora do escopo:** tela da semana (`rebrand-11-admin-screens`), outras contas e provedores, lembretes próprios.

## Capabilities

### New Capabilities
- `google-calendar`: conexão, leitura e escrita de compromissos.

### Modified Capabilities
- `interviews`: ligação entre entrevista e compromisso (requisitos acrescentados).

## Impact

- Tabelas de conexão e de ligação, rotas de OAuth sob `/api/admin`, `src/lib/google-calendar/`, tools e escopos MCP, tela mínima de conexão em Configurações, `.env.example`, `DEPLOY.md`.
- Dependência externa: API do Google Calendar. Marco cria o projeto no Google Cloud.
- **Branch:** main
- **Depende de:** dossier-01-fields
