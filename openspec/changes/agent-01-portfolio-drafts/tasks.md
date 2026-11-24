## 1. Pré-condições

- [ ] 1.1 Confirmar que `portfolio-01-content-in-db` está em produção e que o banco é a fonte do texto (editar um resumo e ver no site)

## 2. Rascunho

- [ ] 2.1 Criar o rascunho (projeto ou projeto novo, conteúdo proposto, revisão, situação, autor) com um aberto por projeto garantido no banco; migração aditiva e teste de concorrência
- [ ] 2.2 Validar o rascunho com as mesmas regras do formulário (links só http ou https, categoria e situação conhecidas); testes
- [ ] 2.3 Calcular a comparação por campo e idioma, contra o que está no ar naquele momento; testes de campo novo, alterado, removido e igual

## 3. Publicar e desfazer

- [ ] 3.1 Publicar exige a revisão vista e que o projeto no ar não tenha mudado desde então; testes dos dois conflitos
- [ ] 3.2 Guardar o estado anterior e desfazer a última publicação; teste de publicar, desfazer e conferir a igualdade
- [ ] 3.3 Revalidar lista, detalhe, home e sitemap nos dois idiomas; teste

## 4. MCP

- [ ] 4.1 Escopos `portfolio:write` e `portfolio:publish`, sem herança entre si; testes de cada combinação
- [ ] 4.2 `list_projects`, `get_project` e `upsert_project_draft`, idempotentes pela chave `slug`; testes
- [ ] 4.3 `publish_project_draft` com `destructiveHint`, revisão obrigatória e auditoria sem retenção de texto; testes de revisão errada, rascunho alterado e chave sem escopo
- [ ] 4.4 Atualizar os comentários que dizem "o MCP não escreve na vitrine" e o `AGENTS.md`; verificar por busca

## 5. Fechamento

- [ ] 5.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
