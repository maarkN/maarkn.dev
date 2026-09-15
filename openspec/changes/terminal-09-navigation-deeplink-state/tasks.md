## 1. Deep-link e âncoras

- [ ] 1.1 Criar leitor de `?cmd=` (client, `Suspense`) com sanitização e execução após boot; verificar `?cmd=projects`, `?cmd=whoami;skills` e `?cmd=%3Cscript%3E`
- [ ] 1.2 Converter `#contact|#projects|#about` em `?cmd=` via `replaceState`; verificar `/en#contact`

## 2. Estado entre páginas

- [ ] 2.1 Persistir `{ history, lastCommands }` em `sessionStorage["maarkn-term"]` (máx. 10, excluindo `open/read/ask/mail`) e reconstruir na montagem com `instant`; verificar ida a um projeto e volta pelo botão do navegador
- [ ] 2.2 `clear` descarta o estado salvo; verificar recarregando após `clear`

## 3. Idioma e navegação

- [ ] 3.1 Implementar `lang [pt|en]` (cookie `locale` + push preservando `?cmd`) e botão `lang <b>en</b>` na barra; verificar `lang pt` em `/en?cmd=skills`
- [ ] 3.2 Implementar `cd <dir>`, `cd`/`cd ~`, `pwd` e erro de diretório; verificar `cd blog` e `cd nada`
- [ ] 3.3 Atualizar `cd ..` do `PageChrome` para apontar para listagem ou `?cmd=<contexto>`; adicionar `aria-current` ao item ativo do menu; verificar em post e projeto

## 4. Verificação

- [ ] 4.1 `pnpm test` (sanitização de `cmd` coberta por unit test), `pnpm lint && pnpm build` verdes; smoke dos cenários da spec
