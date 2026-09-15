## 1. Modo interativo

- [x] 1.1 Implementar `ctx.ask()` no hook (PS1 customizado, sem histórico/autocomplete, `Esc`/`Ctrl+C` rejeitam) e verificar com um comando de teste de duas perguntas
- [x] 1.2 Suportar `Shift+Enter` para múltiplas linhas na etapa de mensagem; verificar visualmente a continuação

## 2. Comando mail

- [x] 2.1 Exportar sub-schemas de `contact.ts`, aceitar `source: "terminal"` e implementar `mail-command.tsx` (nome, email, empresa, mensagem, confirmação, 3 tentativas); verificar fluxo completo com e sem `RESEND_API_KEY`
- [x] 2.2 Implementar `sending…`, sucesso, erro com email direto e rate limit local de 60s; verificar cada saída
- [x] 2.3 Adicionar dica em `contact` e textos `terminal.mail.*` em en/pt-BR; verificar paridade de chaves

## 3. Verificação

- [x] 3.1 Confirmar que `↑` após `mail` mostra apenas `mail`; `pnpm test` (validação por campo) e `pnpm lint && pnpm build` verdes
