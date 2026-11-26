## 1. Pré-condições

- [ ] 1.1 Reproduzir na `main` com `theme classic`, `font daddytime` e depois `lang pt`, e pela barra de uma página interna; registrar atributos e armazenamento antes e depois

## 2. Correção

- [ ] 2.1 Reaplicar a escolha antes da pintura ao remontar; testes de memória, armazenamento, valor inválido e armazenamento bloqueado, que falham sem a mudança
- [ ] 2.2 Gravar só na troca feita pelo visitante; teste de que montar não escreve no armazenamento
- [ ] 2.3 Casos de ponta a ponta nos dois sentidos, por comando, barra e botão voltar, em 390 e 1440 px, com teclado e com movimento reduzido; falham na `main` atual

## 3. Fechamento

- [ ] 3.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
