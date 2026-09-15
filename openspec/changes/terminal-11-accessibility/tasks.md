## 1. Semântica e foco

- [ ] 1.1 Aplicar landmarks, rótulos, skip link e `aria-live` correto no shell; verificar árvore de acessibilidade no DevTools
- [ ] 1.2 Tornar o boot acessível (`aria-hidden` nas linhas, `role="status"` com frase única); verificar com VoiceOver
- [ ] 1.3 Agrupar saída por comando (`section aria-label`), remover dependência de animação para o texto, implementar `Esc` (foco no menu / limpar) e foco no `<h1>` das páginas internas; verificar por teclado

## 2. Contraste, zoom, toque, idioma

- [ ] 2.1 Ajustar `--comment` nas duas paletas e documentar em `.docs/design/tokens.md`; verificar axe sem violações de contraste
- [ ] 2.2 Converter `--fs` para `rem`, condicionar `scroll-behavior`, garantir alvos ≥ 44px no menu mobile e na barra; verificar zoom 200% e Lighthouse "tap targets"
- [ ] 2.3 Marcar nomes de comandos com `lang="en"` em textos pt-BR via helper; verificar HTML de `help` em `/pt-BR`

## 3. Verificação

- [ ] 3.1 axe DevTools: 0 violações em `/en`, `/pt-BR`, `/en/projects/<slug>`, `/en/blog/<slug>` nas duas paletas
- [ ] 3.2 Sessão com VoiceOver e NVDA cobrindo boot, MOTD, `help`, menu `2`, abrir um caso; gravar navegação por teclado em `.docs/design/a11y-keyboard.gif`
- [ ] 3.3 Lighthouse a11y = 100 na home; `pnpm lint && pnpm build` verdes
