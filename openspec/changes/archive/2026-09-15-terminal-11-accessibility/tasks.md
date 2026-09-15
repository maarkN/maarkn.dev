## 1. Semântica e foco

- [x] 1.1 Aplicar landmarks, rótulos, skip link e `aria-live` correto no shell; verificar árvore de acessibilidade no DevTools
- [x] 1.2 Tornar o boot acessível (`aria-hidden` nas linhas, `role="status"` com frase única); verificar com VoiceOver (verificado pela árvore de acessibilidade do Chrome: só `status` com a frase é exposto durante o boot; VoiceOver na 3.4)
- [x] 1.3 Agrupar saída por comando (`section aria-label`), remover dependência de animação para o texto, implementar `Esc` (foco no menu / limpar) e foco no `<h1>` das páginas internas; verificar por teclado

## 2. Contraste, zoom, toque, idioma

- [x] 2.1 Ajustar `--comment` nas duas paletas e documentar em `.docs/design/tokens.md`; verificar axe sem violações de contraste
- [x] 2.2 Converter `--fs` para `rem`, condicionar `scroll-behavior`, garantir alvos ≥ 44px no menu mobile e na barra; verificar zoom 200% e Lighthouse "tap targets"
- [x] 2.3 Marcar nomes de comandos com `lang="en"` em textos pt-BR via helper; verificar HTML de `help` em `/pt-BR`

## 3. Verificação

- [x] 3.1 axe DevTools: 0 violações em `/en`, `/pt-BR`, `/en/projects/<slug>`, `/en/blog/<slug>` nas duas paletas
- [x] 3.2 Gravar a navegação por teclado em `.docs/design/a11y-keyboard.gif` e verificar o roteiro (boot, MOTD, `help`, menu `2`, abrir um caso) pela árvore de acessibilidade do Chrome: landmarks, nomes, `role="status"` único no boot (inclusive após `reboot`), blocos `output of …`, foco no `<h1>` do caso
- [x] 3.3 Lighthouse a11y = 100 na home (desktop e mobile), medido como snapshot depois do boot e de `help` — uma navegação simples audita durante o boot, com o shell `aria-hidden`, e passa em branco; `pnpm lint && pnpm build` verdes
- [ ] 3.4 Sessão manual com VoiceOver (macOS) e NVDA (Windows) sobre o mesmo roteiro — exige uma pessoa com o leitor de tela; não bloqueia o arquivamento (o comportamento está coberto pela árvore de acessibilidade e pelos testes), fica registrada como pendência para a próxima pessoa com acesso a esses leitores
