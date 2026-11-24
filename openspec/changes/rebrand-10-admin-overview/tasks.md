## 1. Pré-condições

- [ ] 1.1 Trazer a `main` com as dependências; confirmar que as leituras agregadas atuais seguem como base (uma consulta por número)

## 2. Dados

- [ ] 2.1 Filtro de período e rota aplicado a todas as leituras, na URL; testes de soma com fixtures
- [ ] 2.2 Séries semanais de envios e respostas e alcance por estágio, com a regra de evidência atual; testes, incluindo denominador zero
- [ ] 2.3 "Precisa de você hoje": prontas para enviar, cobranças, entrevistas sem preparação e pendências do Google; testes de cada origem

## 3. Gráficos

- [ ] 3.1 Linhas, barras, colunas e medidor em SVG, com cruz de leitura, foco por teclado e tabela equivalente; testes de escala e de série vazia
- [ ] 3.2 Validar as cores de série contra a superfície nos três temas; script que falha abaixo do mínimo

## 4. Tela

- [ ] 4.1 Montar a tela conforme `docs/design/backoffice.md`, por seções independentes; uma leitura lenta não segura as outras
- [ ] 4.2 Verificar nos três temas, 390, 1024 e 1440 px, teclado, PT e EN, e com banco indisponível

## 5. Fechamento

- [ ] 5.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
