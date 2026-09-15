## 1. Dados e i18n

- [ ] 1.1 Definir `TerminalData` e montá-lo em `src/app/[lang]/terminal/page.tsx` a partir de `getFeaturedProjects()`/`buildTaglines()` e `getPosts(6)`; verificar que a prop é serializável (sem funções/Date) via `pnpm build`
- [ ] 1.2 Adicionar `site.cvPath` e `public/cv/marco-filho.pdf`; verificar `curl -I /cv/marco-filho.pdf` 200
- [ ] 1.3 Criar a chave `terminal.*` completa em `en.json` e `pt-BR.json` (whoami, experience, skills, projects, writing, contact, errors, fun, files); verificar paridade de chaves entre os dois arquivos

## 2. Comandos

- [ ] 2.1 Implementar `whoami` (parágrafos + tabela `w4` com números de `bigNumbers`) e verificar saída contra o mockup em en e pt-BR
- [ ] 2.2 Implementar `experience` a partir de `timeline` + `dict.about.timeline` com links `next/link` para `/career/[slug]`; verificar navegação interna
- [ ] 2.3 Implementar `skills` (grupos `w10` + métricas `w22` com `<Bar>`); verificar `95%` → 19 blocos
- [ ] 2.4 Implementar `projects` e `open <n>` com `lastList`; verificar `open 2` navega e `open 99` erra corretamente
- [ ] 2.5 Implementar `writing` e `read <n>` com mensagem de lista vazia; verificar com e sem `GHOST_URL`
- [ ] 2.6 Implementar `contact` e `cv` (openExternal + link); verificar abertura do PDF
- [ ] 2.7 Implementar `ls`/`cat` com `FILES` e os dois erros; verificar `cat skills.sys` ≡ `skills`
- [ ] 2.8 Implementar `neofetch` (arte, tabela `w9`, swatches com `var(--*)`, versão de `NEXT_PUBLIC_BUILD_DATE`); verificar swatches mudando após `theme classic`

## 3. Verificação

- [ ] 3.1 `grep -n "Nectar\|Sevencred\|miami" src/lib/terminal` vazio (nenhum conteúdo hardcoded)
- [ ] 3.2 Sessão manual executando todos os comandos em `/en/terminal` e `/pt-BR/terminal` comparando com `.docs/design/maarkn-terminal.html`; `pnpm test && pnpm lint && pnpm build` verdes
