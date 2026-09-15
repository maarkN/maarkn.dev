## 1. Cliente de stream

- [x] 1.1 Extrair `src/lib/chat-client.ts` (`streamChat`) de `use-chat-stream.ts` e fazer o hook consumi-lo; verificar com teste unitário usando um SSE mock que tokens, done e abort são propagados
- [x] 1.2 Garantir `Retry-After` e `X-RateLimit-Limit` no 429 de `/api/chat`; verificar com 11 requisições via `curl`

## 2. Comando ask

- [x] 2.1 Implementar `ask-command.tsx` (uso, `thinking…`, `replaceLast` com throttle, contexto em `ctx.state.chat`, `--new`); verificar pergunta de acompanhamento mantendo contexto
- [x] 2.2 Extrair renderer de markdown para `components/terminal/markdown.tsx` com `next/dynamic` e estilos Dracula; verificar resposta com lista, link e código nas duas paletas
- [x] 2.3 Integrar abort com `Ctrl+C` (`ctx.signal`); verificar na aba Network que a requisição é cancelada e `^C` aparece
- [x] 2.4 Tratar 429 (mensagem com horário) e erro de rede (sugestão de contato); verificar ambos manualmente
- [x] 2.5 Verificar modo offline sem `OPENAI_API_KEY` (respostas mock em streaming)

## 3. Fallback e slash commands

- [x] 3.1 Implementar fallback por `NEXT_PUBLIC_TERMINAL_ASK_FALLBACK` (≥3 palavras, sem `/`), documentar em `.env.example`; verificar os dois cenários da spec
- [x] 3.2 Migrar `ping`, `git`, `pwd`, `hack` para o registry (hidden) e apagar `slash-commands.ts`; verificar `help` listando-os em `also try` e `/help` retornando not found
- [x] 3.3 Adicionar `ask` ao `help` e ao hint do prompt (dicionários en/pt-BR)

## 4. Verificação

- [x] 4.1 Confirmar no `/admin/chat` que as conversas do terminal são registradas
- [x] 4.2 `pnpm test && pnpm lint && pnpm build` verdes
