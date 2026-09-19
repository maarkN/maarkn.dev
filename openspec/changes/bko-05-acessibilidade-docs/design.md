## Context

O admin nunca teve auditoria de acessibilidade além do smoke da change 14, que cobria 10 rotas e um admin bem menor. O backoffice acrescentou board, dossiê com abas, diálogos, sheet e toasts. Ver proposal.md.

## Goals / Non-Goals

**Goals:** o admin utilizável por teclado e leitor de tela, sem regressão de contraste; documentação condizente.
**Non-Goals:** conformidade WCAG formal do admin (é superfície privada, `noindex`, um único usuário); novas funcionalidades.

## Decisions

- **AA como alvo, mesmo sendo superfície privada.** Não por conformidade, mas porque os desvios que a change 14 documentou (`--comment` a 3.2:1, borda de campo a 1.13:1) nasceram de mapeamento descuidado e apareceram como tela ilegível, não como violação abstrata. O critério é o mesmo do site; o rigor de auditoria é menor.

- **Atalho que não se anuncia não existe.** A change 03 introduz `n`/`p`. Em vez de uma tela de ajuda, a linha de paginação mostra as teclas onde a ação está, e o rodapé do chrome ganha uma linha discreta com os atalhos ativos naquela rota. Sem overlay de `?`: uma superfície a mais para manter, para dois atalhos.

- **Movimento reduzido é regra do admin inteiro**, não caso a caso: cursor piscando, linha de progresso e transição de painel do Kanban respeitam `prefers-reduced-motion: reduce`. O site já estabeleceu isso na change 05 do redesign (boot com skip); o admin herda o mesmo princípio.

- **A guarda contra vazamento é um grep no lint, não um teste.** As utilities shadcn (`bg-background`, `text-muted-foreground`…) passaram a existir no site inteiro por causa da decisão de `@theme` da change 01. Um script no `pnpm lint` reprova qualquer ocorrência fora de `src/app/admin`, `src/components/ui` e `src/components/admin` — barato, determinístico e falha no CI, que é onde a regressão seria notada tarde demais.

- **Repositório público:** o chrome novo não pode arrastar dado privado para o bundle público. O admin importa `terminal.module.css` e `prompt.tsx` do site (change 02) — a direção segura. O verificador confere que a recíproca não aconteceu: nada em `src/components/terminal` ou nas rotas `[lang]` passa a importar de `src/components/admin` ou `src/lib/mcp`.

## Risks / Trade-offs

- [A varredura encontrar um defeito estrutural que exija refazer parte da change 03] → é o custo de auditar ao final; o alternativo, auditar dentro de cada change, multiplica o trabalho por quatro e ainda perde os defeitos de interação entre elas.
- [O grep do lint gerar falso positivo em código legítimo] → a lista de diretórios permitidos fica no próprio script, com comentário explicando por que cada um está lá.
