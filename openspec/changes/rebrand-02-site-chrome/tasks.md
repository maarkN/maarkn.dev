## 1. Pré-condições

- [x] 1.1 Confirmar que os primitivos da `rebrand-01-foundation` estão na branch e que a suíte do terminal passa antes de mexer

## 2. Versão CLI

- [x] 2.1 Mover o terminal para `/[lang]/terminal`, com metadata e sem entrar no sitemap; verificar `?cmd=`, histórico e reconstrução da tela no novo endereço
- [x] 2.2 Redirecionar `/[lang]?cmd=…` preservando o valor; testes com comando único, vários e entrada inválida
- [x] 2.3 Ajustar comandos, links e testes do terminal; a suíte existente passa
- [x] 2.4 Atualizar `src/lib/terminal/AGENTS.md` e `docs/design/commands.md`; `pnpm docs:commands` passa

## 3. Topo e rodapé

- [x] 3.1 Topo com todos os controles, entalhe a partir de 1.280 px e versão de celular; verificar nos três temas, 390 e 1440 px, teclado e movimento reduzido
- [x] 3.2 Botão da Versão CLI no topo, na busca e no rodapé, e o caminho de volta na Versão CLI; verificar ida e volta
- [x] 3.3 Troca de idioma leva à rota equivalente e guarda a preferência; testes

## 4. Busca

- [x] 4.1 Índice de seções, páginas, projetos, experiências, temas, idioma e CV, sem acento e por tecnologia, montado no servidor; testes de busca
- [x] 4.2 Janela com setas, `Enter`, `Esc` e anúncio de resultados; carregada só ao abrir; teste de teclado

## 5. Passagem entre páginas

- [ ] 5.1 Transição com View Transitions e queda sem suporte; foco no título da nova página; verificar com leitor de tela
- [x] 5.2 Restaurar a rolagem ao voltar para a home; teste de ponta a ponta

## 6. Fechamento

- [x] 6.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
