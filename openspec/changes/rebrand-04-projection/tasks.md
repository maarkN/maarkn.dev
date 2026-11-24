## 1. Pré-condições

- [ ] 1.1 Registrar Lighthouse e o JavaScript da home antes da mudança (três execuções, mediana); anexar ao PR

## 2. Motor

- [ ] 2.1 Formas como funções puras e determinísticas, com o número de pontos pedido; testes de contagem, limites e repetibilidade
- [ ] 2.2 Renderizador com um programa, sem dependência, com perda e recuperação de contexto; testes de ciclo de vida e de ausência de WebGL
- [ ] 2.3 Carregar depois do texto visível e com a página ociosa, pausar com a aba oculta, reduzir pontos no celular; verificar no painel de desempenho
- [ ] 2.4 Alternativa estática para movimento reduzido, economia de dados e sem WebGL; testes dos três casos

## 3. Coreografia

- [ ] 3.1 Perseguir os marcadores das seções, com mistura entre formas pela rolagem; verificar ida, volta e saltos
- [ ] 3.2 Linha-guia, montagem da tag, decodificação e voo, sem mover o foco nem anunciar duas vezes; testes de ponta a ponta
- [ ] 3.3 Zona de leitura atrás do texto; verificar contraste com a projeção por trás, nos três temas
- [ ] 3.4 Rotas do globo, caos em grade, reação ao ponteiro, estilhaços e HUD; verificar em 1440 px e, no celular, que nada atrapalha o toque

## 4. Medição e decisão

- [ ] 4.1 Medir JavaScript próprio da home, LCP, CLS, INP, nota e quadros por segundo em um celular intermediário real; registrar no PR
- [ ] 4.2 Comparar lado a lado com as capturas de `docs/design/screens` e com a referência em movimento que Marco tem, nos três temas; Marco decide e a decisão é registrada no ADR 0001 (mantém WebGL puro, ou volta a Three.js com revisão do orçamento nesta change)

## 5. Fechamento

- [ ] 5.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
