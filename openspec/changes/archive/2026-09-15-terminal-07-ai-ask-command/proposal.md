## Why

O assistente RAG (`/api/chat`, rate limit durável, log no admin) é um diferencial do site e não deve se perder na migração. Em vez de um painel flutuante, ele passa a viver onde faz sentido em um terminal: um comando `ask` que faz streaming da resposta na própria tela.

## What Changes

- Comando `ask <pergunta>` com streaming token a token, markdown renderizado no estilo do terminal, contexto de conversa por sessão e `ask --new`.
- Cliente de stream extraído para `src/lib/chat-client.ts` (sem UI), reutilizando o endpoint existente.
- `Ctrl+C` aborta o stream em andamento.
- Mensagens amigáveis para rate limit (429) e falhas; modo offline (mock) preservado.
- Fallback opcional (flag `NEXT_PUBLIC_TERMINAL_ASK_FALLBACK`, desligado por padrão): entrada desconhecida com 3+ palavras vai para a IA.
- Slash commands antigos migrados para o registry (`ping`, `git`, `pwd`, `hack`); arquivo `slash-commands.ts` removido.

## Capabilities

### New Capabilities
- `terminal-ai-ask`: comportamento do comando `ask`, streaming, contexto, cancelamento, limites e fallback.

### Modified Capabilities
<!-- nenhuma -->

## Impact

- `src/lib/terminal/ask-command.tsx`, `src/lib/chat-client.ts`, `src/components/chat/use-chat-stream.ts` (passa a usar o cliente), `src/app/api/chat/route.ts` (garantir `Retry-After` no 429), dicionários, `.env.example`.
- Depende de 03 e 06. Desbloqueia a remoção do chat antigo na change 12.
