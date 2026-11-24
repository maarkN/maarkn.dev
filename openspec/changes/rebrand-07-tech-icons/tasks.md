## 1. Pré-condições

- [ ] 1.1 Listar os nomes distintos de tecnologia (toolkit, projetos, experiências) e conferir no LogoForge quais têm logo e com que licença; excluir os marcados só como marca registrada sem licença; registrar a lista no PR
- [ ] 1.2 Conferir na mão os falsos positivos de nome (SOLID não é Solid.js) e as variações (PostgreSQL + pgvector, Apache Kafka)

## 2. Logos

- [ ] 2.1 Copiar os SVG monocromáticos, normalizados (caixa única, cor herdada, sem estilo nem script); script que falha se houver elemento não permitido
- [ ] 2.2 Mapa de nome para logo, com variações; teste que percorre todos os nomes em uso e lista os sem logo
- [ ] 2.3 Registro de origem e licença por arquivo; teste de que todo logo tem registro

## 3. Uso

- [ ] 3.1 Componente com ícone decorativo e nome em texto, renderizado no servidor; teste de nome acessível e de queda sem logo
- [ ] 3.2 Aplicar em tecnologias da home, cards, detalhe, carreira, resumo e nas telas do backoffice já prontas; verificar alinhamento nos três temas
- [ ] 3.3 Medir o peso acrescentado ao HTML da home e da lista; registrar no PR (meta: até 15 kB comprimidos na lista)

## 4. Fechamento

- [ ] 4.1 Gates: `pnpm lint`, `pnpm test` e `pnpm build` (sem `DATABASE_URL`) passam; `openspec validate --all --strict` passa
