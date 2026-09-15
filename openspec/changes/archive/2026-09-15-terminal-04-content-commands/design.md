## Context

`lib/projects-repo.ts` (server, `cache()`), `lib/ghost.ts` (ISR 300s), `lib/timeline.ts` + `dict.about.timeline`, `lib/toolkit.ts` e `lib/site.ts` já alimentam as páginas. O terminal é client component; precisa receber o que é server-only como props serializáveis. Ver proposal.md.

## Goals / Non-Goals

**Goals:**
- Zero duplicação de conteúdo; terminal só formata.
- Saída visualmente idêntica ao mockup para cada comando.

**Non-Goals:**
- IA (`ask`), formulário (`mail`), persistência de índices entre páginas (09).

## Decisions

- **`TerminalData` serializável** montado no server por `loadTerminalData(dict)` (`lib/terminal/data.ts`, `server-only`): `{ numbers, experience, skills, projects, projectLabels, posts, minRead }`. Além de projetos e posts, ele já traz timeline + `dict.about.timeline`, toolkit + rótulos de métricas e os valores de `bigNumbers` resolvidos para o locale — o cliente só formata, sem importar dicionários nem repetir a mescla que `/career` e `/projects` fazem. As listagens reutilizam `projectsLines`/`experienceLines`/`writingLines` de `listings.tsx` (mesmo visual das páginas internas). `site` é importado diretamente (constante client-safe). Alternativa: rotas API para o terminal buscar sob demanda — rejeitada (latência e mais superfície).
- **Comandos de conteúdo recebem `data` via `CommandContext`** (`ctx.data`), mantendo o contrato da change 03. O hook usa `EMPTY_TERMINAL_DATA` quando o host não fornece dados (testes/previews).
- **`TerminalApp` (client)** é quem cria os comandos: a page é server component e não pode passar funções como props, então ela carrega `TerminalData` e renderiza `<TerminalApp>`, que monta `createContentCommands(labels)` (memoizado) e os entrega ao `TerminalShell` via `commands` — antes dos de sistema, na ordem do mockup — junto com `files={FILE_NAMES}` para o Tab após `cat `.
- **Templates com marcação mínima no dicionário** (`lib/terminal/rich.tsx`): `{nome}` é substituído por um nó (números, links, comandos em ciano) e `{{texto}}` imprime um aparte em dim, como os parênteses do `whoami` no mockup. Cabeçalhos já existentes em `terminal.pages.*` (career, writing, links.labels) são reutilizados em vez de duplicados.
- **Cabeçalho de `skills` é `skills.sys`** (o mockup diz `architecture.sys`, inconsistente com o `ls`); rótulos de grupos ficam com as chaves do toolkit (`frontend`, `backend`…), invariantes, e as métricas usam o rótulo traduzido em minúsculas.
- **`experienceLines` ganha `anchors: false`** para o terminal (a lista pode ser impressa mais de uma vez; os `id`s são só para `/career#slug`) e `A` ganha `external` para abrir um caminho local (o PDF) em nova aba sem passar pelo `next/link`.
- **`open`/`read` usam índices da última listagem impressa** guardados em `ctx.state.lastList` (`{ kind: "projects"|"writing", slugs[] }`); sem listagem prévia, usam a ordem padrão de `data`.
- **Navegação interna via `ctx.navigate` (router.push)**, não `window.open` — o mockup abre nova aba porque é um HTML solto; aqui somos o próprio site. Externos (`cv`, redes) via `ctx.openExternal` + link impresso (caso o popup seja bloqueado).
- **`neofetch` usa as variáveis CSS (`var(--cyan)` etc.)** nas amostras para reagir à troca de paleta sem reimprimir.
- **`FILES` é o único mapa fixo do módulo** (`{ 'whoami.txt': 'whoami', … }`) — é metadados de UI, não conteúdo.
- **Versão em `neofetch`** derivada de `process.env.NEXT_PUBLIC_BUILD_DATE` definido no `next.config.ts` (`YYYY.MM`).

## Risks / Trade-offs

- [Descrições de projetos (`taglines`) vivem em dicionário por slug; projetos novos do admin não têm tagline traduzida] → reutilizar `buildTaglines()` já existente, que faz o fallback.
- [Posts do Ghost são en-only] → mesma limitação do `/blog` atual; a lista é a mesma em pt-BR.
- [PDF do CV ausente em `public/`] → incluído nesta change (79 kB, 3 páginas). Não havia PDF em `../resume/` (só markdown), então `marco-filho.pdf` foi tipografado a partir de `marco_filho_resume.md`; substituir pelo PDF oficial quando existir.
- [Versão em `neofetch`] → `next.config.ts` define `env.NEXT_PUBLIC_BUILD_DATE` (`YYYY.MM` do build); `buildVersion()` cai na data corrente se o stamp faltar.
