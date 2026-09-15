## 1. Tokens

- [x] 1.1 Criar tokens Dracula `soft` em `:root` e `classic` em `:root[data-theme="classic"]` em `globals.css` e verificar que `data-theme='classic'` via DevTools troca todas as cores
- [x] 1.2 Substituir os blocos `[data-theme="light"]`/`[data-theme="dev"]`, scanlines e classes `dev-*` por aliases legados apontando para os tokens novos; verificar `grep -rn '"dev"\|"light"' src` limpo (exceto migração de storage)
- [x] 1.3 Atualizar `@theme inline` expondo `--color-{cyan,green,orange,pink,purple,red,yellow,comment,line,sel,bg-dim}` e verificar que `bg-purple`/`text-comment` compilam em um componente de teste

## 2. Fontes

- [x] 2.1 Carregar Cascadia Code (`next/font/google` ou `local` como fallback) como `--font-caskaydia` e verificar `preload` gerado no HTML
- [x] 2.2 Adicionar `src/app/fonts/DaddyTimeMono.otf` + LICENSE e carregá-la com `next/font/local` (`preload: false`, `--font-daddytime`); verificar na aba Network que não é baixada no carregamento padrão
- [x] 2.3 Remover Inter/Space Grotesk/JetBrains Mono do layout e apontar `--font-sans/display/mono` para `--font`; verificar que nenhuma fonte proporcional aparece na aba Network

## 3. ThemeProvider e boot

- [x] 3.1 Reescrever `theme-provider.tsx` com `Theme = soft|classic`, `Font = caskaydia|daddytime`, toggles e persistência em `maarkn-theme`/`maarkn-font`; verificar com teste manual de alternância sem reload
- [x] 3.2 Atualizar `themeBootScript` para aplicar `data-theme` e `data-font` e migrar `dark|dev→soft`, `light→classic`; verificar recarregando com `localStorage.maarkn-theme='dev'` (sem flash, sem erro)
- [x] 3.3 Adaptar `theme-switcher.tsx` para ciclar soft/classic e `layout.tsx` (`data-theme="soft" data-font="caskaydia"`, `themeColor #282A36`, sem `DevMarqueeStrip`); verificar `pnpm lint && pnpm build` verdes

## 4. Verificação

- [x] 4.1 Smoke em todas as rotas públicas e `/admin/login` nas duas paletas e fontes; verificar ausência de warnings de hidratação e de FOUC em 3G simulado
- [x] 4.2 Copiar decisões de contraste pendentes para `.docs/design/tokens.md` (entrada para a change 11)
