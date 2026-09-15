## 1. Estrutura

- [ ] 1.1 Criar `src/components/terminal/primitives.tsx` (cores, `Row`, `Bar`, `A`) e verificar renderização em uma página de teste com Storybook-like manual
- [ ] 1.2 Criar `terminal-shell.tsx` com grid `auto minmax(0,1fr)` / `200px minmax(0,1fr)` e classe de `overflow:hidden` aplicada ao `<html>` só enquanto montado; verificar que `/en/projects` continua rolando

## 2. Componentes

- [ ] 2.1 Implementar `status-bar.tsx` (user, título do dicionário, botões theme/font via `useTheme`, relógio SSR `--:--`) e verificar ausência de warning de hidratação
- [ ] 2.2 Implementar `command-menu.tsx` com os 8 itens, `kbd`, hover/focus, estado `done` e callback `onCommand`; verificar por clique que o callback recebe o nome certo
- [ ] 2.3 Implementar `motd.tsx` (server component) lendo `dict.terminal.motd` e `dict.bigNumbers`; verificar textos em `/en/terminal` e `/pt-BR/terminal`
- [ ] 2.4 Implementar `prompt.tsx` (PS1, texto ecoado, cursor, input invisível, estado blur) e `screen.tsx` com foco ao clicar; verificar digitação ecoando e cursor vazado ao perder foco
- [ ] 2.5 Implementar `output.tsx`/`line.tsx` com `aria-live="polite"` e animação `in` com delay por índice; verificar com 3 linhas mock

## 3. Rota, i18n e responsivo

- [ ] 3.1 Criar `src/app/[lang]/terminal/page.tsx` montando o shell e adicionar chaves `terminal.bar/menu/motd/hint` em `en.json` e `pt-BR.json`; verificar `pnpm build`
- [ ] 3.2 Implementar media query ≤720px (menu no rodapé, título oculto, `--fs 13px`, `.row` colapsando exceto `w4`); verificar em 390px sem scroll horizontal
- [ ] 3.3 Adicionar `prefers-reduced-motion` desligando blink/transições; verificar com emulação do DevTools

## 4. Verificação

- [ ] 4.1 Comparar `/en/terminal` com `.docs/design/maarkn-terminal.html` em 1440px e 390px (screenshots lado a lado em `.docs/design/compare/`); divergências ≤ 2px
- [ ] 4.2 Confirmar `grep -rn dangerouslySetInnerHTML src/components/terminal` vazio e `pnpm lint` verde
