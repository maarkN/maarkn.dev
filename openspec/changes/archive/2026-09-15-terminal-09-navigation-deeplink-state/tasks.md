## 1. Deep-link e âncoras

- [x] 1.1 Criar leitor de `?cmd=` (client, `Suspense`) com sanitização e execução após boot; verificar `?cmd=projects`, `?cmd=whoami;skills` e `?cmd=%3Cscript%3E`
- [x] 1.2 Converter `#contact|#projects|#about` em `?cmd=` via `replaceState`, na montagem e em `hashchange`; verificar `/en#contact`

## 2. Estado entre páginas

- [x] 2.1 Persistir `{ history, lastCommands, cmd? }` em `sessionStorage["maarkn-term"]` (máx. 10, excluindo `open/read/ask/mail/cd/lang/cv`, `clear/cls/reboot` e comandos desconhecidos — ver design) e reconstruir na montagem com `instant`; verificar ida a um projeto e volta pelo botão do navegador
- [x] 2.2 `clear` descarta `lastCommands` e `cmd` (mantém `history`); verificar recarregando após `clear`

## 3. Idioma e navegação

- [x] 3.1 Implementar `lang [pt|en]` (cookie `locale` + push preservando `?cmd`) e botão `lang <b>en</b>` na barra; verificar `lang pt` em `/en?cmd=skills`
- [x] 3.2 Implementar `cd <dir>`, `cd`/`cd ~`, `pwd` e erro de diretório; verificar `cd blog` e `cd nada`; `cd ~` a partir de `/en?cmd=skills` carregado direto vai por `history.pushState` (ver design) e foi conferido em navegador real
- [x] 3.3 Atualizar `cd ..` do `PageChrome` para apontar para listagem ou `?cmd=<contexto>`; adicionar `aria-current` ao item ativo do menu; verificar em post e projeto

## 4. Verificação

- [x] 4.1 `pnpm test` (sanitização de `cmd` coberta por unit test), `pnpm lint && pnpm build` verdes; smoke dos cenários da spec
- [x] 4.2 Smoke em navegador real (Chromium headless contra `next start`, com e sem reduced motion) dos cenários que os testes com router mockado não provam: `cd ~`/`cd` a partir de `/en?cmd=skills` e `/pt-BR?cmd=skills` carregados direto; `cd projects` → `cd ..` → `?cmd=projects` (listagem uma vez); `lang pt` em `/en?cmd=skills` (cookie `locale`, `skills` uma vez, `/` → 307 `/pt-BR`); `/en#contact` → `?cmd=contact`; `whoami`, `projects`, `open 1`, voltar (saídas reconstruídas, `↑` = `open 1`); voltar para `/en?cmd=projects` sem listagem duplicada — inclusive quando a chegada a `/en?cmd=projects` foi um `cd ..` que não reimprimiu a listagem (`projects`, `cd projects`, `cd ..`, `whoami`, `open 1`, voltar; coberto também por unit test em `terminal-app.test.tsx`). Repetir antes de arquivar se `next` for atualizado
