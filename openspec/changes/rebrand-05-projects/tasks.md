## 1. Pré-condições

- [ ] 1.1 Guardar o texto renderizado dos 19 detalhes atuais, nos dois idiomas, para comparar no fim

## 2. Lista

- [ ] 2.1 Lista no servidor com categoria e busca pela URL, aplicadas também sem JavaScript; testes de filtro, busca sem acento, por tecnologia e vazio
- [ ] 2.2 Destaques com pausa, teclado e sem avanço sob movimento reduzido; teste
- [ ] 2.3 Ícone por projeto, com queda para o monograma; verificar os 19 nos três temas

## 3. Detalhe

- [ ] 3.1 Estrutura completa a partir do repositório, no idioma pedido; testes de projeto aberto, privado, sem link, sem galeria e inexistente (404)
- [ ] 3.2 Perguntas rápidas derivadas dos dados, para cada situação; testes
- [ ] 3.3 Galeria com ampliação, setas, legenda e texto alternativo; teste de teclado
- [ ] 3.4 Projetos parecidos por categoria e tecnologia; teste de ordem estável e de projeto sem parecidos

## 4. Fechamento

- [ ] 4.1 Comparar o texto com o guardado em 1.1 (nada de conteúdo perdido) e auditar lista e detalhe com axe nos três temas
- [ ] 4.2 Ampliar `scripts/e2e-site.mjs`; verificar em 390 e 1440 px
- [ ] 4.3 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
