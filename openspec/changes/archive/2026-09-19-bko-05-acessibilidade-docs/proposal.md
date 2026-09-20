## Why

As changes 01–04 trocam cor, moldura, tabela, formulário e diálogo de 18 rotas. A change 11 do redesign mostrou que uma reestilização dessa profundidade cria dívidas de acessibilidade que só aparecem quando alguém as procura de propósito — e nenhuma das quatro anteriores tem, sozinha, a visão do conjunto.

Esta change fecha o ciclo: varredura completa, guardas contra regressão e a documentação que ainda descreve um admin que deixou de existir.

## What Changes

- Varredura de acessibilidade nas 18 rotas: contraste, foco visível, nome acessível, ordem de tabulação, `prefers-reduced-motion`.
- Atalhos de teclado do admin documentados na interface, não só no código.
- Guarda contra vazamento das utilities shadcn para fora do admin.
- Varredura de 390px em todas as rotas.
- Atualização da spec `admin-theme`, do `src/app/admin/AGENTS.md` e dos READMEs, que ainda descrevem o admin de painel.

## Capabilities

### New Capabilities
<!-- nenhuma -->

### Modified Capabilities
- `admin-theme`: o requisito de funcionalidade preservada passa a cobrir as 18 rotas do backoffice, e ganha exigências de teclado e movimento reduzido.

## Impact

- Correções pontuais em qualquer arquivo tocado pelas changes 01–04.
- `openspec/specs/admin-theme/spec.md`, `src/app/admin/AGENTS.md`, `README.md`, `README.pt-BR.md`.
- Depende das changes 01–04. Fecha a série.
