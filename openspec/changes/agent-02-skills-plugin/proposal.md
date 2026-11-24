## Why

As tools MCP existem, mas usá-las pede que Marco saiba seus nomes, chaves e ordem. Skills de agente com nome claro transformam pedidos como "registrar esta candidatura" em um fluxo previsível.

## What Changes

- Plugin `maarkn-dev` neste repositório, instalável como marketplace do Claude Code, com a conexão MCP lida do ambiente.
- Skills: `register-application`, `update-application`, `list-applications`, `show-application`, `log-event`, `schedule-interview`, `show-agenda`, `triage-jobs`, `register-job`, `generate-resume`, `update-project`, `list-projects` e `review-and-publish`.
- As skills só orquestram tools: nenhuma regra de negócio e nenhuma exclusão.
- Descrições de tools e skills em inglês; nomes e chaves de retorno existentes não mudam.
- Regra do `folderName` para candidatura criada fora do Obsidian.

**Fora do escopo:** plugin para outras ferramentas, tools novas e telas.

## Capabilities

### New Capabilities
- `agent-skills`: o que as skills de agente fazem, pedem e recusam.

### Modified Capabilities

## Impact

- `.claude-plugin/marketplace.json`, `plugins/maarkn-dev/`, descrições das tools MCP, tela de chaves (modelos de chave), READMEs, glossário.
- **Branch:** main
- **Depende de:** dossier-01-fields, dossier-02-sent-documents, agenda-01-google-calendar, agent-01-portfolio-drafts
