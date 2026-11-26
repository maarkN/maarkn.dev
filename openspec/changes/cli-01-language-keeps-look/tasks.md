## 1. Pré-condições

- [x] 1.1 Reproduzir na `main` com `theme classic`, `font daddytime` e depois `lang pt`, e pela barra de uma página interna; registrar atributos e armazenamento antes e depois

## 2. Correção

- [x] 2.1 Reaplicar a escolha antes da pintura ao remontar; testes de memória, armazenamento, valor inválido e armazenamento bloqueado, que falham sem a mudança
- [x] 2.2 Gravar só na troca feita pelo visitante; teste de que montar não escreve no armazenamento
- [x] 2.3 Casos de ponta a ponta nos dois sentidos, por comando, barra e botão voltar, em 390 e 1440 px, com teclado e com movimento reduzido; falham na `main` atual
- [x] 2.4 Reconstruir a tela da Versão CLI sem reaplicar `theme` e `font`; teste de que um `theme` sem argumento reexecutado e uma troca posterior pela barra sobrevivem à remontagem, que falha sem a mudança

## 3. Fechamento

- [ ] 3.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
