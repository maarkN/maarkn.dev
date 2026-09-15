## Context

`src/app/_actions/contact.ts` valida nome/email/empresa/tipo/mensagem, tem honeypot e envia via Resend quando há chave (senão loga). O engine (03) previu `ctx.ask(label): Promise<string>` sem implementar. Ver proposal.md.

## Goals / Non-Goals

**Goals:** reutilizar a action e o schema; UX de wizard de terminal.
**Non-Goals:** anexos, captcha, múltiplos destinatários.

## Decisions

- **Modo interativo no hook**: `ctx.ask(label, { mask?, inputMode?, enterKeyHint?, multiline?, hint? })` troca o PS1 por `→ label ` (o rótulo traz a própria pontuação: `name:`, `send? [Y/n]`) e resolve a Promise no próximo Enter; `Esc`/`Ctrl+C` rejeitam com `AbortError` (`lib/terminal/abort.ts`) sem abortar o comando, que decide o que imprimir. Enquanto ativo, o handler de keydown não aplica autocomplete nem histórico (`↑`/`↓` ignorados, Tab segue o foco nativo), e a resposta não é gravada no histórico. A pergunta chega ao comando via `RunnerIO.ask(label, options, signal)`: o runner injeta o `signal` do comando e a Promise também rejeita quando ele é abortado (`Ctrl+L`, clique no menu, novo comando), para nenhum comando ficar preso esperando o prompt. Enquanto há pergunta pendente, a dica sob o prompt vira `prompt.askHint` (ou `options.hint`). Alternativa: máquina de estados dentro do comando — mais código e acoplado; rejeitada.
- **Validação por campo** reutilizando os sub-schemas (`nameSchema`, `emailSchema`, `companySchema`, `messageSchema`, `typeSchema`) de `src/lib/contact-schema.ts` — um módulo `"use server"` só pode exportar funções async, então os schemas Zod vivem ao lado e `contact.ts` passa a validar com o mesmo `contactSchema` (códigos de erro `required`/`invalid`/`too_long` inalterados).
- **Action**: aceitar `source: "terminal"` no payload (só rotula o email: `Source: terminal`) e manter o honeypot vazio; nenhuma mudança na validação.
- **Envio**: o comando faz `await submitContact(...)` diretamente — comandos rodam fora do React e o runner já espera comandos async sem travar o input, então `startTransition` não é necessário. `sending…` (dim, com cursor) via `ctx.print` e o resultado via `replaceLast`. `createMailCommand(labels, { send, now, storage })` aceita o transporte injetado para os testes.
- **Rate limit local** em `sessionStorage["maarkn-mail-at"]` (epoch ms do último envio bem-sucedido), independente do rate limit server-side.
- **Mobile**: `inputMode="email"` na etapa de email, `enterkeyhint="next"`/`"send"`.
- **Registro**: `terminal-app.tsx` insere `mail` logo após `cv`, para aparecer no `help` junto de `contact`.

## Risks / Trade-offs

- [Texto longo em um input de linha única] → a etapa de mensagem aceita múltiplas linhas via `Shift+Enter` (`multiline: true`): cada linha é ecoada e o prompt passa a mostrar a continuação `… `; a resposta é o `join("\n")`.
- [Spam pelo terminal] → honeypot não se aplica; o rate limit local + o server-side (já existente) mitigam; observar volume e adicionar Turnstile se necessário (fora de escopo).
