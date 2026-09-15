## Why

A sequência de boot é a assinatura do design: seis linhas digitadas com efeito typewriter antes do terminal aparecer. Ela precisa ser rápida de pular, respeitar redução de movimento, não se repetir a cada navegação interna e não atrapalhar SEO nem o teclado do celular.

## What Changes

- Overlay de boot com typewriter, linhas do dicionário, `[ok]` em verde, skip por tecla/toque.
- Exibição uma vez por sessão de navegador; `reboot` reexecuta.
- Respeito a `prefers-reduced-motion` (pula direto).
- Foco automático no prompt ao terminar, exceto em dispositivos de toque.
- Shell já presente no DOM (SSR) por baixo do overlay.

## Capabilities

### New Capabilities
- `terminal-boot`: comportamento da sequência de boot (tempo, skip, repetição, acessibilidade básica, foco).

### Modified Capabilities
<!-- nenhuma -->

## Impact

- `src/components/terminal/boot-overlay.tsx`, integração no `terminal-shell`, comando `reboot` real no engine, chave `terminal.boot` nos dicionários.
