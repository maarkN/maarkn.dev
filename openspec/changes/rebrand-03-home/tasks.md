## 1. Pré-condições

- [ ] 1.1 Trazer a `main` com `portfolio-01-content-in-db` para a branch; confirmar que os três casos vêm do banco e da semente

## 2. Conteúdo

- [ ] 2.1 Abertura e oito seções no servidor, com os textos de `docs/design/site.md` nos dois dicionários; verificar o HTML com JavaScript desligado
- [ ] 2.2 Experiências (três mais recentes com o número-resumo), casos (problema, trabalho, resultado) e projetos pessoais a partir das fontes; teste com lista vazia
- [ ] 2.3 Tecnologias com "onde usei" calculado dos projetos e experiências; testes de alias e de tecnologia sem uso
- [ ] 2.4 O que resolvo e O processo, operáveis por teclado; o processo avança sozinho até a primeira interação e nunca sob movimento reduzido; testes

## 3. Trilho

- [ ] 3.1 Oito links no HTML, ordem correta, seção atual marcada; teste com leitor de tela e com JavaScript desligado
- [ ] 3.2 Descoberta que só cresce, guardada na sessão e mantida nas páginas internas; testes de rolar para cima, pular seções, focar item oculto e "mostrar todas"
- [ ] 3.3 Menu da base no celular, com páginas e seções; verificar em 390 px e com teclado virtual

## 4. Contato e assistente

- [ ] 4.1 Formulário com a validação e o limite existentes, erros por campo e foco no primeiro; testes de erro, sucesso e falha de envio
- [ ] 4.2 Painel da assistente com perguntas sugeridas, streaming, interromper, e mensagem de limite; carregado só ao abrir; testes com a rota simulada
- [ ] 4.3 `/[lang]/chat`, `?ask` e âncoras antigas; testes de redirecionamento

## 5. Fechamento

- [ ] 5.1 Ampliar `scripts/e2e-site.mjs` com descoberta, contato e assistente; verificar nos três temas, 390 e 1440 px
- [ ] 5.2 Marco revisa no PR os textos de "O que resolvo" e "O processo"; registrar a aprovação
- [ ] 5.3 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
