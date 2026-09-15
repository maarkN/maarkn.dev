## Context

`use-chat-stream.ts` (139 l.) faz `fetch` SSE de `/api/chat`, mantém `messages` e aborta via `AbortController`; `chat-panel.tsx` renderiza markdown (commit `87e0e97`). O endpoint aplica rate limit durável (`lib/rate-limit.ts`) e grava em `lib/chat-log.ts`. Ver proposal.md.

## Goals / Non-Goals

**Goals:** reaproveitar 100% do backend; `ask` como cidadão de primeira classe do registry.
**Non-Goals:** mudar modelo/prompt/RAG; remover `chat-panel.tsx` (change 12).

## Decisions

- **`streamChat({ messages, locale, signal, onToken, onDone, onError })` em `lib/chat-client.ts`**, sem React. `use-chat-stream.ts` passa a envolvê-lo (mantém o painel funcionando até ser apagado). Alternativa: importar o hook dentro do comando — impossível (comando não é componente).
- **Renderização**: `ask` imprime uma linha `<AskAnswer text={partial}/>` e usa `ctx.replaceLast` a cada token; `AskAnswer` reutiliza o renderer de markdown do painel, extraído para `src/components/terminal/markdown.tsx` e carregado com `next/dynamic` (só no primeiro `ask`).
- **Contexto** em `ctx.state.chat.messages` (memória da sessão do terminal); `clear` e `ask --new` zeram.
- **Abort**: o engine expõe `ctx.signal` do comando em execução; `Ctrl+C` chama `abort()` — mesma via da change 03. Como o runner ignora `replaceLast` depois do abort, o cursor de streaming de `<AskAnswer>` se esconde sozinho ouvindo o `signal` (`useSyncExternalStore`); o texto parcial fica e entra no contexto.
- **429**: endpoint passa a enviar `Retry-After` (segundos), `X-RateLimit-Limit` e `X-RateLimit-Window` (segundos: 3600 para o limite por visitante, 86400 para o diário); o comando formata `rate limit: 10 messages/hour · try again at HH:mm` (janela → hour/day/min). Erro de rede ou 5xx: mensagem em vermelho + `· try again … or reach me via contact`. Turno com erro não entra no contexto.
- **Fallback** por `process.env.NEXT_PUBLIC_TERMINAL_ASK_FALLBACK === "true"`, avaliado a cada chamada; exige ≥ 3 palavras e não começar com `/`. Mecanismo: `createRunner({ fallback })` recebe um `Fallback = (text, ctx) => { line, notice } | null` consultado quando o nome não resolve; o runner imprime `notice` e executa `line` (`ask <input>`), sem ecoar de novo nem duplicar o histórico. `TerminalApp` registra `createAskFallback(labels)`; o `TerminalShell` genérico continua sem fallback.
- **Slash commands**: `ping`, `git`, `pwd`, `hack` viram comandos em `system-commands.tsx` (hidden no `help`, listados em `also try`); `/help` etc. deixam de existir. `ask /…` também é recusado (`ask: no slash commands here`). `chat-panel.tsx` (morto, some na 12) passa a usar `streamChat` e o `Markdown` extraído, sem slash commands.
- **Contexto**: `clear`, Ctrl+L e `ask --new` zeram via `resetConversation(ctx.state)` — o hook chama no `clearScreen`, cobrindo tanto o comando quanto o atalho.

## Risks / Trade-offs

- [Custo de tokens com fallback ligado] → padrão desligado; decisão explícita por env.
- [Markdown parcial durante streaming pode renderizar listas quebradas por instantes] → aceitável; o renderer já tolera fragmentos.
- [`replaceLast` a cada token força re-render] → throttle de 32ms no comando.
