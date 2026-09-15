## Context

`lib/projects-repo.ts` (server, `cache()`), `lib/ghost.ts` (ISR 300s), `lib/timeline.ts` + `dict.about.timeline`, `lib/toolkit.ts` e `lib/site.ts` já alimentam as páginas. O terminal é client component; precisa receber o que é server-only como props serializáveis. Ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Zero duplicação de conteúdo; terminal só formata.
- Saída visualmente idêntica ao mockup para cada comando.

**Non-Goals:**
- IA (`ask`), formulário (`mail`), persistência de índices entre páginas (09).

## Decisions

- **`TerminalData` serializável** montado na page (server): `{ projects: Pick<RepoProject, slug|name|year|category|status|stack|taglineKey>[], posts: Pick<Post, slug|title|tags|publishedAt|readingTime>[] }`. Timeline, toolkit e site são importados diretamente (são constantes client-safe). Alternativa: rotas API para o terminal buscar sob demanda — rejeitada (latência e mais superfície).
- **Comandos de conteúdo recebem `data` via `CommandContext`** (`ctx.data`), mantendo o contrato da change 03.
- **`open`/`read` usam índices da última listagem impressa** guardados em `ctx.state.lastList` (`{ kind: "projects"|"writing", slugs[] }`); sem listagem prévia, usam a ordem padrão de `data`.
- **Navegação interna via `ctx.navigate` (router.push)**, não `window.open` — o mockup abre nova aba porque é um HTML solto; aqui somos o próprio site. Externos (`cv`, redes) via `ctx.openExternal` + link impresso (caso o popup seja bloqueado).
- **`neofetch` usa as variáveis CSS (`var(--cyan)` etc.)** nas amostras para reagir à troca de paleta sem reimprimir.
- **`FILES` é o único mapa fixo do módulo** (`{ 'whoami.txt': 'whoami', … }`) — é metadados de UI, não conteúdo.
- **Versão em `neofetch`** derivada de `process.env.NEXT_PUBLIC_BUILD_DATE` definido no `next.config.ts` (`YYYY.MM`).

## Risks / Trade-offs

- [Descrições de projetos (`taglines`) vivem em dicionário por slug; projetos novos do admin não têm tagline traduzida] → reutilizar `buildTaglines()` já existente, que faz o fallback.
- [Posts do Ghost são en-only] → mesma limitação do `/blog` atual; a lista é a mesma em pt-BR.
- [PDF do CV ausente em `public/`] → incluir nesta change; tamanho < 500 kB.
