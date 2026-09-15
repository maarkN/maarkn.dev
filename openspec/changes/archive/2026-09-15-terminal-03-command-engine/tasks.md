## 1. Núcleo puro

- [x] 1.1 Criar `src/lib/terminal/types.ts` e `registry.ts` (`register/alias/resolve/list`) e verificar com teste unitário de alias e resolução case-insensitive
- [x] 1.2 Criar `parse.ts` (tokenização, nome/args) e `history.ts` (push com dedupe, up/down, espelho em `sessionStorage`) com testes cobrindo `↓` além do fim e dedupe
- [x] 1.3 Criar `complete.ts` (comando único, prefixo comum, candidatos, modo `cat`) com testes para `proj`, `w`, `cat wh`
- [x] 1.4 Adicionar `vitest` e script `pnpm test`; verificar suite verde em CI local

## 2. Comandos de sistema

- [x] 2.1 Implementar `system-commands.tsx` (`help`, `clear/cls`, `history`, `echo`, `date`, `exit/logout`, `sudo`, `rm`, `uptime`, `whereami`, `reboot` stub) com textos do dicionário; verificar cada saída contra o mockup
- [x] 2.2 Implementar `theme` e `font` chamando `ThemeApi`, com aviso laranja quando a face não carregar (`document.fonts.load` + `check` sobre a família que `next/font` expõe em `--font-daddytime`; ver design); verificar barra atualizando

## 3. Hook e integração

- [x] 3.1 Criar `use-terminal.ts` (estado de linhas, `run`, `print`, `replaceLast`, `done` do menu, keydown com Enter/↑/↓/Tab/Ctrl+L/Ctrl+C, auto-scroll) e ligar ao `terminal-shell`; verificar cada atalho (coberto por `terminal-shell.test.tsx` em jsdom — sem browser disponível na execução paralela)
- [x] 3.2 Garantir saída assíncrona (`Promise`) com abort em `clear`; verificar com um comando de teste que imprime 3 linhas com atraso (`run.test.ts` e `terminal-shell.test.tsx`)
- [x] 3.3 Verificar que a entrada `<img src=x onerror=alert(1)>` aparece literal e que `grep dangerouslySetInnerHTML src/components/terminal src/lib/terminal` está vazio

## 4. Verificação

- [x] 4.1 `pnpm test && pnpm lint && pnpm build` verdes; cenários da spec reproduzidos em `terminal-shell.test.tsx` (jsdom) e SSR de `/en/terminal` e `/pt-BR/terminal` conferido via `next start` + curl
