## Why

O painel de hoje mostra números, mas não responde o que Marco pergunta ao abrir: o que espera por mim, o que vem na semana e se o esforço está dando resposta.

## What Changes

- Números principais com o medidor de taxa de resposta, gráfico de envios e respostas por semana, até onde as candidaturas chegaram e conversas com a assistente.
- Filtros de período e rota que valem para tudo.
- "Precisa de você hoje" e painel lateral com agenda, cobranças e acontecimentos.
- Tela traduzida.

**Fora do escopo:** novas métricas além das listadas, exportação.

## Capabilities

### New Capabilities
- `admin-overview`: visão geral do backoffice.

### Modified Capabilities

## Impact

- `src/app/admin/page.tsx`, `src/components/admin/dashboard/**`, `src/components/admin/charts/**`, dicionários.
- **Branch:** feat/rebranding
- **Depende de:** rebrand-08-admin-shell, dossier-01-fields, agenda-01-google-calendar
