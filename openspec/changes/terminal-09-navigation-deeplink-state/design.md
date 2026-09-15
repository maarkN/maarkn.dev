## Context

`src/proxy.ts` lê o cookie `locale` e `Accept-Language`. O engine (03) já espelha o histórico em `sessionStorage`. A page do terminal é ISR; `searchParams` não podem torná-la dinâmica. Ver proposal.md.

## Goals / Non-Goals

**Goals:** URLs compartilháveis, volta sem perda, idioma pelo prompt.
**Non-Goals:** sincronizar a URL a cada comando digitado (poluiria o histórico do navegador).

## Decisions

- **`?cmd=` lido no client** (`useSearchParams` dentro de `Suspense`) para manter a page estática/ISR. Alternativa: `searchParams` na page (server) — rejeitada (forçaria render dinâmico).
- **Sanitização**: split por `;`, cada item validado por `^[a-z?]+( [\w .-]{0,80})?$` e nome resolvido no registry; comandos destrutivos de estado (`reboot`, `clear`) são permitidos, `ask` só sem argumento (evita URLs que gastam cota de IA de terceiros).
- **Estado em `sessionStorage["maarkn-term"]`** = `{ history, lastCommands }` (não o output). Reconstrução re-executa `lastCommands` com `instant: true`; `open`/`read`/`ask`/`mail` não entram em `lastCommands` (efeitos colaterais).
- **`lang`**: grava cookie `locale` (mesmo nome do proxy, `path=/`, 1 ano) e `router.push` para a rota equivalente preservando `?cmd`. Botão na barra chama `run('lang')`.
- **Âncoras**: `useEffect` único no shell lê `location.hash` na montagem, mapeia e substitui por `?cmd=` via `history.replaceState`.
- **`cd`** resolve contra um mapa fixo de diretórios → rotas; `cd ..` só existe como link nas páginas internas (no terminal, `cd ..` imprime `already at ~`).

## Risks / Trade-offs

- [Re-executar `projects` na volta usa `data` do SSR, que pode ter revalidado] → aceitável; conteúdo fresco é desejável.
- [`useSearchParams` exige `Suspense` e pode adiar a hidratação do shell] → boundary envolve só o leitor de `cmd`, não o shell.
