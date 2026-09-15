## Context

`use-chat-stream.ts` (139 l.) faz `fetch` SSE de `/api/chat`, mantém `messages` e aborta via `AbortController`; `chat-panel.tsx` renderiza markdown (commit `87e0e97`). O endpoint aplica rate limit durável (`lib/rate-limit.ts`) e grava em `lib/chat-log.ts`. Ver proposal.md.

## Goals / Non-Goals

**Goals:** reaproveitar 100% do backend; `ask` como cidadão de primeira classe do registry.
**Non-Goals:** mudar modelo/prompt/RAG; remover `chat-panel.tsx` (change 12).

## Decisions

- **`streamChat({ messages, locale, signal, onToken, onDone, onError })` em `lib/chat-client.ts`**, sem React. `use-chat-stream.ts` passa a envolvê-lo (mantém o painel funcionando até ser apagado). Alternativa: importar o hook dentro do comando — impossível (comando não é componente).
- **Renderização**: `ask` imprime uma linha `<AskAnswer text={partial}/>` e usa `ctx.replaceLast` a cada token; `AskAnswer` reutiliza o renderer de markdown do painel, extraído para `src/components/terminal/markdown.tsx` e carregado com `next/dynamic` (só no primeiro `ask`).
- **Contexto** em `ctx.state.chat.messages` (memória da sessão do terminal); `clear` e `ask --new` zeram.
- **Abort**: o engine expõe `ctx.signal` do comando em execução; `Ctrl+C` chama `abort()` — mesma via da change 03.
- **429**: endpoint passa a enviar `Retry-After` (segundos) e `X-RateLimit-Limit`; o comando formata `rate limit: 10 messages/hour · try again at HH:mm`.
- **Fallback** por `process.env.NEXT_PUBLIC_TERMINAL_ASK_FALLBACK === "true"`, avaliado no `run` do handler de "not found"; exige ≥ 3 palavras e não começar com `/`.
- **Slash commands**: `ping`, `git`, `pwd`, `hack` viram comandos (hidden no `help`, listados em `also try`); `/help` etc. deixam de existir.

## Risks / Trade-offs

- [Custo de tokens com fallback ligado] → padrão desligado; decisão explícita por env.
- [Markdown parcial durante streaming pode renderizar listas quebradas por instantes] → aceitável; o renderer já tolera fragmentos.
- [`replaceLast` a cada token força re-render] → throttle de 32ms no comando.
