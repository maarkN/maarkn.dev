## 1. Pré-condições

- [ ] 1.1 Listar os valores distintos de `outcomeReason` e `Interview.outcome` numa cópia do banco, para o mapeamento inicial; anexar ao PR

## 2. Esquema

- [ ] 2.1 Acrescentar o texto da empresa, o contexto do projeto, o motivo de encerramento (enum nativo) e, na entrevista, situação e ordem; migração aditiva aplicada em banco vazio e em cópia de produção
- [ ] 2.2 Preencher a situação das entrevistas existentes (com data futura: marcada; com resultado: realizada; sem data: prevista); conferir contagens antes e depois

## 3. Regras

- [ ] 3.1 Motivo só em candidatura recusada ou retirada, e limpo ao sair desses estágios; teste de cada transição
- [ ] 3.2 Situação coerente com a data (marcada exige data; prevista não a tem); teste de cada combinação
- [ ] 3.3 Vocabulário traduzível em PT e EN, em um lugar só; teste de cobertura de todos os valores

## 4. MCP

- [ ] 4.1 `upsert_interview` com chave natural, escopo `applications:write`, auditoria e proveniência; testes de criação, repetição sem duplicar, candidatura inexistente e chave sem escopo
- [ ] 4.2 Campos novos em `upsert_application` (campo omitido não apaga) e nas leituras, com texto de terceiros cercado como não confiável; testes
- [ ] 4.3 Atualizar `seed-demo` e conferir o dossiê atual com os campos novos

## 5. Fechamento

- [ ] 5.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
