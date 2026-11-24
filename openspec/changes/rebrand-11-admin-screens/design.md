## Context

Ver proposal.md e `docs/design/backoffice.md`. A página atual do dossiê faz uma leitura única e espera a consulta para responder 404 de verdade; isso se mantém.

## Goals / Non-Goals

**Goals:** telas completas sobre as leituras e regras já entregues na `main`; nenhuma regra nova aqui.

**Non-Goals:** regra de negócio na tela.

## Decisions

- **Uma leitura do dossiê para painel e página**, com o painel por rota interceptada, para o endereço ser sempre o mesmo.
- **A prévia usa os componentes do site**, com os dados do formulário. Um componente só de prévia divergiria.
- **A agenda desenha a própria grade.** Uma biblioteca de calendário pesaria e brigaria com o desenho; são cinco dias e uma coluna por sobreposição.
- **Marcar é otimista só na tela**: a pendência do Google vem do servidor.

## Risks / Trade-offs

- [Change grande] → Quatro blocos independentes; podem virar quatro PRs para a mesma change.
