## 1. Pré-condições

- [ ] 1.1 Medir o tamanho dos PDFs reais de Marco e confirmar que 2 MB cobre todos; registrar no PR

## 2. Guarda

- [ ] 2.1 Criar o documento enviado (candidatura, tipo, nome, tamanho, hash, conteúdo, data de envio); migração aditiva aplicada em banco vazio
- [ ] 2.2 Aceitar só PDF, conferindo a assinatura do arquivo e não só a extensão; testes com PDF válido, imagem renomeada, arquivo vazio e acima do limite
- [ ] 2.3 Recusar alteração e exclusão depois do envio, no servidor; teste

## 3. Leitura

- [ ] 3.1 Rota que exige sessão, com `Cache-Control: private, no-store`, tipo fixo e nome seguro; testes sem sessão (401 ou redirecionamento), com sessão e com id inexistente (404)
- [ ] 3.2 Confirmar que a listagem de candidaturas não carrega o conteúdo do arquivo; teste que inspeciona a consulta

## 4. MCP

- [ ] 4.1 `attach_sent_document` (escopo `applications:write`), idempotente pelo hash; testes de repetição, arquivo inválido e chave sem escopo
- [ ] 4.2 `get_application` devolve só metadados; auditoria registra tamanho e hash, nunca o conteúdo; testes

## 5. Fechamento

- [ ] 5.1 Atualizar `DEPLOY.md` (o backup cobre os arquivos e cresce com eles); verificar pela leitura
- [ ] 5.2 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
