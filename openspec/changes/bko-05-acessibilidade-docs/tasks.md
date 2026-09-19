## 1. Acessibilidade

- [ ] 1.1 axe nas 18 rotas (incluindo diálogos abertos, sheet do detalhe e board); zero violação crítica ou séria, e registrar as moderadas com decisão
- [ ] 1.2 Percorrer o admin inteiro só com teclado: foco sempre visível, sem armadilha em diálogo/sheet/abas, ordem de tabulação coerente; verificar retorno de foco ao fechar cada diálogo
- [ ] 1.3 Conferir `prefers-reduced-motion: reduce` em todas as animações introduzidas (cursor, progresso, painéis); nada pisca ou desliza
- [ ] 1.4 Lighthouse a11y ≥ 90 em `/admin/login` e `/admin/applications`

## 2. Guardas

- [ ] 2.1 Script de lint reprovando utilities shadcn fora de `src/app/admin`, `src/components/ui` e `src/components/admin`; verificar que falha ao introduzir um uso proposital no site e passa depois de removê-lo
- [ ] 2.2 Conferir que nada do site público importa de `src/components/admin` ou `src/lib/mcp` (`grep -rn "components/admin\|lib/mcp" src/app/\[lang\] src/components/terminal`)
- [ ] 2.3 Varredura de 390px nas 18 rotas: nenhuma com rolagem horizontal do documento

## 3. Documentação

- [ ] 3.1 Atualizar `openspec/specs/admin-theme/spec.md` com os deltas das changes 01 e 05 (o texto vigente ainda diz "sem virar terminal")
- [ ] 3.2 Atualizar `src/app/admin/AGENTS.md` com os padrões novos: listagem, paginação com atalho, colchetes, `stderr:`, toast como linha
- [ ] 3.3 Atualizar `README.md` e `README.pt-BR.md` na seção do admin

## 4. Fechamento

- [ ] 4.1 `pnpm lint && env -u DATABASE_URL pnpm build && pnpm test` verdes; arquivar as changes 00–05
