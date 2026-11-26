## Context

Ver proposal.md. O router semeia o cache de rotas com a URL do documento. A busca (`?cmd=`) sofria do mesmo mal e foi contornada na Versão CLI (change arquivada `2026-09-15-terminal-09-navigation-deeplink-state`). Nenhuma versão mais nova foi testada ainda; em 2026-11-25 a última estável da linha é a 16.4.6.

## Goals / Non-Goals

**Goals:** endereço correto sem código próprio em volta do router.

**Non-Goals:** retirar o contorno de `?cmd=`, que continua testado.

## Decisions

- **Atualizar em vez de remendar.** Um remendo na dependência teria de ser refeito a cada versão.
- **Escolher a primeira versão estável que corrige**, e não a última, para mudar o mínimo. Entre duas equivalentes, a que tem correção de segurança.
- **Change própria**, sem outra mudança junto: se a produção piorar, voltar é reverter um commit.

## Risks / Trade-offs

- [Nenhuma versão 16 corrige] → A tarefa 1.2 para a change antes de tocar em qualquer arquivo.
- [Comportamento de cache, prefetch ou transição muda] → Ponta a ponta completo na `main` e, depois de trazida, em `feat/rebranding`.
- [O build ou o JavaScript da home cresce] → Comparar com o orçamento de `site-seo-performance` antes do merge.
