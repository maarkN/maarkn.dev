## 1. Overlay

- [ ] 1.1 Criar `boot-overlay.tsx` com typewriter (timings do mockup), `[ok]` verde por split de string e linhas de `dict.terminal.boot`; verificar duração 3–5s
- [ ] 1.2 Implementar skip por `keydown`/`pointerdown` com `AbortController` e impressão imediata das linhas; verificar toque durante a linha 2
- [ ] 1.3 Implementar `prefers-reduced-motion` (omitir boot) e foco condicional por `(pointer: fine)`; verificar em emulação mobile que o teclado não abre

## 2. Sessão e reboot

- [ ] 2.1 Ler/gravar `sessionStorage["maarkn-booted"]` com `try/catch` e estado inicial neutro (sem flash); verificar ida a `/en/projects/<slug>` e volta sem boot
- [ ] 2.2 Implementar `reboot` real no engine (limpa saída, apaga a flag, remonta overlay); verificar pelo prompt

## 3. Verificação

- [ ] 3.1 `curl -s localhost:5050/en/terminal | grep -c 'maarkn@dev'` ≥ 1 (shell presente no HTML SSR por baixo do overlay)
- [ ] 3.2 Sessão manual: primeira visita, skip, volta, reboot, reduced-motion; `pnpm lint && pnpm build` verdes
