## 1. Pré-condições

- [ ] 1.1 Listar no PR as telas cobertas e os comportamentos que não podem mudar (confirmação por digitação, formulário que preserva o digitado, contagem real do quadro)

## 2. Listas

- [x] 2.1 Tabela semântica com ordenação, linha clicável por teclado, paginação no servidor e filtros na URL; testes
- [x] 2.2 Vazio, carregando e erro com a ação seguinte; testes
- [x] 2.3 Atalhos de página anunciados na tela e inativos em campo de texto; teste
- [x] 2.4 Quadro com contagem real, teto por coluna, arrastar, setas e desfazer; testes de falha do servidor durante a mudança

## 3. Formulários e avisos

- [x] 3.1 Campo com rótulo, ajuda, obrigatoriedade por extenso e erro ligado ao campo; testes de nome acessível
- [x] 3.2 Formulário preserva o digitado no erro e foca o primeiro campo com problema; o teste de regressão existente passa
- [x] 3.3 Confirmação destrutiva com digitação do nome e cancelar como padrão; teste
- [x] 3.4 Avisos anunciados, sem detalhe interno; teste

## 4. Telas

- [ ] 4.1 Aplicar e traduzir as telas listadas na proposal; verificar cada uma nos três temas, 390 e 1440 px, teclado, PT e EN
- [ ] 4.2 Rótulos de estágio, motivo, situação e visto vindos do dicionário, com cobertura de todos os valores; teste
- [ ] 4.3 Coluna de ações de `/admin/api-keys` sem cortar botão, em 390 e 1440 px; teste

## 5. Aposentar

- [ ] 5.1 Reescrever as regras A9 a A13 do `AGENTS.md` do backoffice e remover o que não é mais usado; verificar pela leitura e por `pnpm exec knip`
- [ ] 5.2 `scripts/a11y-admin-axe.mjs` (com teclado, movimento e 390 px) sem violação nos três temas

## 6. Fechamento

- [ ] 6.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
