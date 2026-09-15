## 1. Overlay

- [x] 1.1 Criar `boot-overlay.tsx` com typewriter (timings do mockup), `[ok]` verde por split de string e linhas de `dict.terminal.boot`; verificar duração 3–5s
- [x] 1.2 Implementar skip por `keydown`/`pointerdown` com `AbortController` e impressão imediata das linhas; verificar toque durante a linha 2
- [x] 1.3 Implementar `prefers-reduced-motion` (omitir boot) e foco condicional por `(pointer: fine)`; verificar em emulação mobile que o teclado não abre

## 2. Sessão e reboot

- [x] 2.1 Ler/gravar `sessionStorage["maarkn-booted"]` com `try/catch` e estado inicial neutro (sem flash); verificar ida a `/en/projects/<slug>` e volta sem boot
- [x] 2.2 Implementar `reboot` real no engine (limpa saída, apaga a flag, remonta overlay); verificar pelo prompt

## 3. Verificação

- [x] 3.1 `curl -s localhost:5050/en/terminal | grep -c 'maarkn@dev'` ≥ 1 (shell presente no HTML SSR por baixo do overlay) — verificado em `next start` (porta 5055): 1 ocorrência, MOTD presente, overlay `pending` com `<noscript>` e shell sem `inert` no HTML
- [x] 3.2 Sessão manual: primeira visita, skip, volta, reboot, reduced-motion; `pnpm lint && pnpm build` verdes — cenários cobertos por `boot-overlay.test.tsx` (jsdom, timers falsos) por não haver navegador disponível; lint/build/test verdes
