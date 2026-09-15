## Why

O mockup mistura definição de comandos, parsing, histórico e renderização em um único IIFE com `innerHTML`. Para o terminal ser seguro (input do usuário nunca vira markup), testável e extensível (IA, mail, navegação), a lógica precisa virar módulos puros em TypeScript com um hook React fino por cima.

## What Changes

- Novo pacote `src/lib/terminal/` com `types`, `registry`, `parse`, `complete`, `history` e `system-commands`.
- Hook `use-terminal.ts` conectando engine ao shell da change 02.
- Comandos de sistema: `help`, `clear`/`cls`, `history`, `echo`, `date`, `theme`, `font`, `exit`/`logout`, `sudo`, `rm`, `uptime`, `whereami`, `reboot` (stub que só limpa).
- Aliases numéricos e de vocabulário (`about→whoami`, `work→projects`, `blog→writing`, `stack→skills`, `career→experience`, `resume→cv`).
- Histórico com `↑/↓`, autocomplete com `Tab`, `Ctrl+L`, `Ctrl+C`.
- Suporte a resultado assíncrono e a linhas anexadas/substituídas incrementalmente (base para streaming da IA).
- Vitest adicionado ao projeto com testes dos módulos puros.

## Capabilities

### New Capabilities
- `terminal-command-engine`: interpretação de entrada, resolução de comandos e aliases, histórico, autocomplete, atalhos de teclado e comportamento de saída.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- Novos arquivos em `src/lib/terminal/` e `src/components/terminal/use-terminal.ts`; `vitest` em devDependencies e script `pnpm test`.
- `terminal-shell` passa a ser controlado pelo hook. Nenhuma rota pública além de `/[lang]/terminal` é afetada.
