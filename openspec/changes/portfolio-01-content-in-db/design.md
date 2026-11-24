## Context

Ver proposal.md e o ADR 0003. Hoje a página resolve `dicionário[slug] ?? coluna do banco`; as colunas `tagline`, `description`, `role` e `featuresJson` guardam inglês, e `db:sync-projects` as sobrescreve a partir do código.

## Goals / Non-Goals

**Goals:** uma fonte só de texto, bilíngue, com queda segura; migração repetível; nenhum texto público perdido.

**Non-Goals:** CMS genérico, terceiro idioma, histórico de versões (os rascunhos têm change própria).

## Decisions

- **Colunas por idioma em vez de tabela de traduções.** São dois idiomas fixos e quatro campos; uma tabela exigiria junção em toda leitura e não paga o custo. As colunas atuais viram o inglês, para a migração ser aditiva.
- **Ordem de queda: idioma pedido no banco, outro idioma no banco, semente.** Mostrar o texto no outro idioma, marcado, é melhor que página vazia.
- **Posição do caso no próprio projeto** (nula ou 1 a 3, única). Substitui um booleano: já traz a ordem e o limite.
- **Galeria em tabela própria**, porque tem ordem e legenda por imagem; os arquivos continuam em `/uploads`, que é adequado por serem imagens públicas.

## Risks / Trade-offs

- [Texto do dicionário e do banco divergem com o tempo] → Está no ADR; `AGENTS.md` e o README avisam que o dicionário é semente.
- [Migração roda depois do deploy e a página fica sem texto] → Coluna vazia cai na semente, então não há janela sem conteúdo.

## Migration Plan

1. Migração aditiva no deploy. 2. Script de conteúdo, idempotente, pelo serviço `migrate`. 3. Conferir os 19 projetos. Volta: reverter o código; as colunas novas são ignoradas pela versão anterior.
