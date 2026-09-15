## Context

`src/app/_actions/contact.ts` valida com Zod, tem honeypot e envia via Resend quando há chave (senão loga). O engine (03) previu `ctx.ask(label): Promise<string>` sem implementar. Ver proposal.md.

## Goals / Non-Goals

**Goals:** reutilizar a action e o schema; UX de wizard de terminal.
**Non-Goals:** anexos, captcha, múltiplos destinatários.

## Decisions

- **Modo interativo no hook**: `ctx.ask(label, { mask?, inputMode?, enterKeyHint? })` troca o PS1 por `→ label:` e resolve a Promise no próximo Enter; `Esc`/`Ctrl+C` rejeitam com `AbortError`. Enquanto ativo, o handler de keydown não aplica autocomplete nem histórico, e a resposta não é gravada no histórico. Alternativa: máquina de estados dentro do comando — mais código e acoplado; rejeitada.
- **Validação por campo** reutilizando os sub-schemas exportados de `contact.ts` (`emailSchema`, `messageSchema`) — exportá-los em vez de duplicar.
- **Action**: aceitar `source: "terminal"` no payload e manter o honeypot vazio; nenhuma mudança na validação.
- **Envio** via `startTransition` para não bloquear o input; `sending…` com `replaceLast`.
- **Rate limit local** em `sessionStorage["maarkn-mail-at"]`, independente do rate limit server-side.
- **Mobile**: `inputMode="email"` na etapa de email, `enterkeyhint="next"`/`"send"`.

## Risks / Trade-offs

- [Texto longo em um input de linha única] → a etapa de mensagem aceita múltiplas linhas via `Shift+Enter`, exibindo continuação `… `.
- [Spam pelo terminal] → honeypot não se aplica; o rate limit local + o server-side (já existente) mitigam; observar volume e adicionar Turnstile se necessário (fora de escopo).
