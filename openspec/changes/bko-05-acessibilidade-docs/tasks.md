## 1. Acessibilidade

- [x] 1.1 axe nas 18 rotas (incluindo diálogos abertos, sheet do detalhe e board); zero violação crítica ou séria, e registrar as moderadas com decisão
- [x] 1.2 Percorrer o admin inteiro só com teclado: foco sempre visível, sem armadilha em diálogo/sheet/abas, ordem de tabulação coerente; verificar retorno de foco ao fechar cada diálogo
- [x] 1.3 Conferir `prefers-reduced-motion: reduce` em todas as animações introduzidas (cursor, progresso, painéis); nada pisca ou desliza
- [x] 1.4 Lighthouse a11y ≥ 90 em `/admin/login` e `/admin/applications`

> Ferramenta: `scripts/a11y-admin-axe.mjs` (Chrome headless por CDP, axe-core da
> store do pnpm, zero dependência nova). **23** superfícies: as 18 rotas + 3
> `AlertDialog` + 2 `Dialog`. O `Sheet` NÃO entra: `ApplicationQuickSheet` não
> é importado por nenhuma rota, então a superfície era medida como duplicata
> da rota de fundo e contada como limpa. Volta com `A11Y_SHEET_PATH=…`.
>
> As fixtures que a régua precisa sobem e descem por
> `scripts/a11y-fixtures.mjs up|down` (ver §4). E os ids das rotas de detalhe
> NÃO são mais chumbados no script: depois do login ele lê o primeiro id de
> `/admin/applications`, `/admin/projects` e `/admin/generator` e imprime de
> onde veio cada um (`ids: application=… [listagem /admin/applications]`).
> O motivo é concreto: o id que estava no arquivo
> (`cmu89ib6c001cce4g78lhbjfn`) morre a cada `pnpm db:seed:demo`, a rota vira
> o 404 do Next — e uma página 404 não tem violação nenhuma, então a
> superfície entrava na conta como LIMPA. Régua que quebra a cada seed não é
> régua. `A11Y_APPLICATION_ID`/`A11Y_PROJECT_ID`/`A11Y_GENERATION_ID` ainda
> sobrescrevem, o valor chumbado ficou só como último recurso, e rota que
> responde 404 agora é FALHA declarada (`[404 em … — superfície NÃO medida]`,
> exit 1) nos três modos. Controle negativo desta guarda:
> `A11Y_GENERATION_ID=idmorto… --only generator:detail` → `✗ generator:detail
> … [404 em /admin/generator/idmorto… — superfície NÃO medida]`, exit 1.
>
> - **1.1 FECHADA nesta passagem.** O zero de duas passagens atrás foi medido
>   com a régua errada:
>   `target-size` (WCAG 2.2 SC 2.5.8, AA, impacto **serious**) vem
>   `enabled: false` no conjunto padrão do axe, então a varredura nunca a
>   executou — e havia **11 violações serious**, 5 em
>   `/admin/applications/board` e 6 em `/admin/contacts`, nas duas larguras.
>   CORRIGIDO na origem, dos dois lados:
>     - a marcação: `min-h-6` (24px) nos links do breakdown de
>       `kanban-board.tsx` e nos três links empilhados de `ContactLinks`
>       (`contacts/page.tsx`) — mediam 17.6px e 16px de altura, com 2px
>       entre eles, abaixo do mínimo E da exceção de espaçamento;
>     - a régua: `scripts/a11y-admin-axe.mjs` agora liga `target-size` por
>       `rules` (que ACRESCENTA ao conjunto padrão, ao contrário de
>       `runOnly: [tags]`, que o substituiria).
>   Também corrigido: a superfície `overlay:sheet` era contada como limpa
>   sem nunca abrir (o `ApplicationQuickSheet` não está montado em lugar
>   nenhum) — as "24 superfícies" eram 23. O Sheet saiu do roteiro padrão e
>   volta com `A11Y_SHEET_PATH=…`; gatilho não encontrado agora é FALHA e
>   sai 1, nos três modos.
>   Continuam válidas as duas correções do caminho anterior:
>   `color-contrast` serious nas listagens com overlay aberto
>   (`has-aria-expanded:bg-muted/50` deixava `--comment` a 3.75:1, conferido
>   de forma independente) e `page-has-heading-one` moderate no login.
>   VARREDURA EXECUTADA, enfim, com sessão autenticada de verdade (usuário
>   descartável `a11y-audit@local.test`, criado por
>   `scripts/a11y-fixtures.mjs up` com senha aleatória vinda do ambiente):
>     `node scripts/a11y-admin-axe.mjs`                    → 23 superfícies,
>       **0 violação critical/serious**, 0 com rolagem horizontal,
>       0 gatilho não encontrado, 0 rota 404, exit 0;
>     `… --width 390 --height 844`                         → idem, 23/0/0/0/0.
>   Os 5 overlays aparecem `[aberto]` nas duas larguras.
>
>   O que a varredura autenticada achou e as sondas anteriores não podiam
>   achar: **10 ocorrências de `target-size` (serious) em `/admin/contacts`**,
>   e a causa NÃO era a altura dos alvos — os links de contato já mediam
>   24px. O axe apontava `partially obscured (smallest space is 166.8px by
>   22px …)` e o `relatedNodes` nomeava o culpado, que está em OUTRA coluna:
>   `tr > td:nth-child(3) > .pt-0\.5.min-h-6`, o link da candidatura na célula
>   de empresa. Aquele link é `inline-flex` com um `<span class="truncate">`
>   dentro: item de flex não encolhe abaixo do conteúdo, então o `truncate`
>   nunca truncava e o link VAZAVA para fora da própria célula. Medido no
>   Chrome headless, antes: `td` de 664 a 982px, link de 672 a **1179px** —
>   ~200px por cima da coluna de contato, cobrindo os links de e-mail e
>   LinkedIn (defeito visual, não só de auditoria). Depois de
>   `max-w-full` no link e `min-w-0` no `<span>`: link de 672 a **974px**,
>   dentro da célula, e `--only contacts` passa de `s1` (10 ocorrências)
>   para `s0`.
> - **1.2** `--keyboard`, REEXECUTADO no fechamento com sessão autenticada:
>   **23 superfícies, 0 problema de teclado**, exit 0 — e as 5 linhas de
>   overlay trazem `esc→fechou, foco em button "…"` com o gatilho nomeado
>   (`"Excluir a candidatura de Ipê Data"`, `"Excluir Projeto de auditoria
>   a11y"`, `"Excluir contato Aoife Rossi"`, `"[ registrar evento ]"`,
>   `"[ editar campos-chave ]"`). Medição anterior, que continua valendo:
>   0 problema em 1440×900 e em 390×844. Escape fecha os
>   5 overlays e devolve o foco ao gatilho em todos (reconferido de forma
>   independente, com driver próprio, na verificação). Duas paradas sem foco
>   visível foram encontradas e corrigidas (os campos do tty e o painel de aba
>   do Radix, que o primitive marcava com `outline-none`). A metade "sheet" da
>   tarefa continua INVERIFICÁVEL enquanto o `Sheet` não estiver montado em
>   rota nenhuma — não vale como aprovação, vale como "não existe para testar".
> - **1.3** `--motion`, REEXECUTADO no fechamento: **23 superfícies, 0
>   animação/transição NÃO colapsada**, `media true` em todas, 0 gatilho
>   não encontrado, 0 rota 404. Controle negativo `--motion no-preference`
>   no mesmo percurso: **323 não colapsadas** e exit 1 (eram 133 antes de o
>   roteiro passar a abrir os 5 overlays de verdade) — a sonda enxerga, então
>   o zero do outro lado significa alguma coisa.
> - **1.4** Lighthouse 12 (`--only-categories=accessibility`, preset desktop):
>   **100** em `/admin/login` e **100** em `/admin/applications`.

## 2. Guardas

- [x] 2.1 Script de lint reprovando utilities shadcn fora de `src/app/admin`, `src/components/ui` e `src/components/admin`; verificar que falha ao introduzir um uso proposital no site e passa depois de removê-lo
- [x] 2.2 Conferir que nada do site público importa de `src/components/admin` ou `src/lib/mcp` (`grep -rn "components/admin\|lib/mcp" src/app/\[lang\] src/components/terminal`)
- [x] 2.3 Varredura de 390px nas 18 rotas: nenhuma com rolagem horizontal do documento

> - **2.1** `scripts/check-admin-utilities.ts`, dentro do `pnpm lint`. A lista
>   de tokens é LIDA do bloco `shadcn vocabulary` do `@theme inline`, não
>   digitada. Prova: com `bg-background text-muted-foreground` plantado no
>   `<body>` de `src/app/[lang]/layout.tsx`, `pnpm lint` → exit 1 apontando
>   arquivo:linha; removido, → exit 0.
>
>   CORREÇÃO desta passagem: a própria guarda vazava para o CSS. O Tailwind
>   v4 varre o REPOSITÓRIO INTEIRO atrás de nomes de classe e não distingue
>   markup de PROSA sobre markup — qualquer arquivo que apenas FALE sobre
>   utilities emite aquelas regras no chunk CSS compartilhado que TODA página
>   pública carrega. Três ofensores nesta change: `scripts/`
>   (a lista de prefixos e a mensagem de erro da guarda, +653 bytes), o
>   `AGENTS.md` §A7 e — descoberto ao medir a própria correção — ESTE
>   tasks.md, cuja nota reintroduziu o vazamento na primeira tentativa de
>   arrumá-lo com exclusões arquivo a arquivo.
>   Por isso a correção NÃO é `@source not` para cada ofensor, que é corrida
>   atrás do prejuízo: é `@import "tailwindcss" source("../../src")`, que
>   fixa a raiz da detecção automática no único diretório onde existe markup.
>   `scripts/`, `openspec/`, `docs/` e os READMEs ficam de fora por
>   construção; sobra um `@source not` para os três `.md` dentro de `src/`
>   (o AGENTS.md e duas licenças de fonte).
>   MEDIDO, `env -u DATABASE_URL next build` nos dois lados (baseline num
>   `git worktree` de c88dfbc com o mesmo node_modules; os quatro chunks do
>   baseline batem byte a byte com os do relatório anterior — 75 037 /
>   20 243 / 3 984 / 3 429):
>     chunk CSS compartilhado  75 037 → **73 300 bytes** (−1 737, −2,3%)
>     seletores de classe          737 → 721
>     ADICIONADOS: 1 — `min-h-6` (a correção de target-size)
>     REMOVIDOS:  17 — todos CSS morto vindo de prosa fora de `src/`
>   Conferido um a um que nenhum dos 17 é usado como classe em `src`: os
>   únicos casos que o grep encontra são valores de propriedade CSS
>   (`position: sticky`, `border-collapse: collapse`) e comentários dentro
>   de `admin.css`. As formas com variante que o código realmente usa
>   continuam emitidas (`after:` e `data-[state=open]:` das duas que mais
>   assustavam); o que saiu foi só a forma sem variante, que ninguém escreve.
>   Atenção para quem editar: `globals.css` também é varrido, e por isso o
>   comentário de lá não escreve nenhum nome de utility por extenso.
>   ADENDO desta passagem: a correção do vazamento na célula de empresa dos
>   contatos acrescentou uma utility de verdade ao markup (`max-w-full`), e o
>   chunk CSS compartilhado passou de 73 300 para **73 327 bytes** — +27, uma
>   regra nova, usada. A prosa que esta nota acrescentou ao tasks.md continua
>   fora da varredura do Tailwind por construção (`source("../../src")`), que
>   é exatamente o ponto de ter fixado a raiz em vez de caçar ofensor.
> - **2.2** Zero import. A única ocorrência textual é um comentário em
>   `src/components/terminal/use-clock.ts` que documenta a direção inversa.
> - **2.3 FECHADA nesta passagem.** O zero de duas passagens atrás era um
>   artefato da medição. O script
>   emulava `mobile: WIDTH < 640`; nessa emulação o Chrome aplica o viewport
>   meta e ALARGA a viewport layout até caber o conteúdo, então
>   `documentElement.scrollWidth` e `window.innerWidth` cresciam juntos
>   (898 e 898 na mesma rota) e a guarda não podia reprovar. Com
>   `mobile: false` o par vira 874 × 390. Rolagem real: **5 das 17 rotas
>   autenticadas a 390px e 13 a 320px** (o limiar do SC 1.4.10 Reflow).
>   CAUSA-RAIZ, isolada por bisseção: `.top` é item de grid de `.shell`
>   (`display: grid`) e não declarava `min-width: 0`, então seu tamanho
>   mínimo automático virava o min-content do `<header class="bar">` — que
>   contém o caminho da rota com `white-space: nowrap`. O `overflow: hidden`
>   do `.bar` NÃO zera o min-content do item de grid pai. `.screen` e `.nav`
>   já tinham `min-width: 0`; `.top` ficou de fora.
>   CORRIGIDO dos dois lados: `min-width: 0` em `.top`
>   (`admin-chrome.module.css`) e, na régua, `mobile: false` mais a
>   comparação contra a largura PEDIDA em vez de `innerWidth` — se a
>   emulação voltar a alargar a viewport, a guarda continua reprovando.
>   VARREDURA EXECUTADA no fechamento, com sessão autenticada:
>   `node scripts/a11y-admin-axe.mjs --width 390 --height 844` → **23
>   superfícies, 0 com rolagem horizontal** (a coluna `⟂` não aparece em
>   nenhuma linha), 0 violação critical/serious, exit 0. A mesma passagem em
>   1440×900: 0 também.
>   Evidência da bisseção que continua valendo, em Chrome headless contra o
>   dev server, com a moldura `AdminChrome` real num caminho de rota longo
>   (sonda temporária, já removida):
>     - com a correção:  `scrollWidth` = 320 / 390 / 1440 em cada viewport;
>     - controle negativo, comentando a única linha nova:
>       `scrollWidth` = **653** tanto em 320 quanto em 390.
>   Ou seja: a linha é a causa e é a correção, e a sonda enxerga o defeito.

## 3. Documentação

- [x] 3.1 Atualizar `openspec/specs/admin-theme/spec.md` com os deltas das changes 01 e 05 (o texto vigente ainda diz "sem virar terminal")
- [x] 3.2 Atualizar `src/app/admin/AGENTS.md` com os padrões novos: listagem, paginação com atalho, colchetes, `stderr:`, toast como linha
- [x] 3.3 Atualizar `README.md` e `README.pt-BR.md` na seção do admin

> **3.2/3.3, correções desta passagem.** A receita §4 do `AGENTS.md` não
> compilava como escrita: definia `const stage = one(sp.stage)` e passava
> `status={status}` nas duas instâncias de `<ApplicationsToolbar>`, cuja prop
> real é `stage` (`applications-toolbar.tsx:86`). Defeito pré-existente, mas
> o diff desta change movia essas duas linhas exatas enquanto dizia "receita
> reescrita para o código real" — corrigido. Nos dois READMEs, a árvore do
> repositório tinha dois `└──` irmãos no mesmo nível (`components/admin/`
> seguido de `components/ui/`); o primeiro virou `├──`.
>
> **3.2, o que a passagem anterior AINDA não tinha auditado.** A nota acima
> dizia "receita corrigida contra o código real" e duas coisas continuavam
> falsas no `AGENTS.md`; esta passagem fechou as duas.
>
> 1. **A receita ainda não compilava.** O cabeçalho das §3 e §4.1 renderizava
>    `actions={<ApplicationDialog />}` e o diff desta própria change tinha
>    APAGADO o `import { ApplicationDialog }` do bloco — um componente que não
>    existe em `src/` nenhum (`grep -rn "ApplicationDialog" src/` → vazio).
>    A página real usa um link para a rota de criação, e é isso que a receita
>    passa a ensinar: `<Button asChild size="sm"><Link
>    href="/admin/applications/new">[ nova candidatura ]</Link></Button>`, com
>    `Link`, `Plus` e `Button` nos imports. Junto foram embora as outras duas
>    referências a arquivo inexistente: `applications-table.tsx` ("faz isso
>    hoje" — não existe; o texto agora cita `parseApplicationFilters`,
>    `parsePage` e `listApplications`, que existem) e o rótulo da receita (b),
>    que apontava para `src/app/admin/applications/application-dialog.tsx`.
> 2. **A §5 ensinava o defeito que a bko-04 mediu e corrigiu.** A receita de
>    dialog trazia `<form action={onSubmit}>` com o comentário de que o React
>    "NÃO reseta o form sozinho", e o arquivo inteiro nunca mencionava
>    `submitKeepingValues` (`grep -n "submitKeepingValues\|form-submit"
>    src/app/admin/AGENTS.md` → rc=1). Quem seguisse a receita canônica
>    reintroduzia o bug que `form-submit.test.tsx` trava no CI e que oito
>    telas já não têm. A §5 foi reancorada no par que EXISTE
>    (`src/app/_actions/contacts.ts` + `src/app/admin/contacts/contact-dialog.tsx`),
>    ganhou a §5.3 com a medição do estrago e a lista de quem usa
>    `submitKeepingValues`, e a regra virou normativa como **A15** na tabela do
>    §0, com item de checklist no §8 e linha no inventário do §9. O comentário
>    errado ficou no arquivo UMA vez, marcado `ERRADO` dentro da §5.3, para
>    quem encontrar a cópia dele numa tela antiga.
>
> Evidência executável, e um controle negativo. As duas classes de defeito são
> mecanicamente detectáveis, então esta passagem escreveu um verificador
> (`/tmp/check-agents-recipes.mjs`, fora do repo: é ferramenta de auditoria,
> não código de produção) que extrai todo bloco ```` ```ts ````/```` ```tsx ````
> do `AGENTS.md`, passa cada um pelo parser do esbuild e, nos blocos que se
> apresentam como ARQUIVO (primeira linha `// src/…`), exige que toda tag JSX
> `<Maiúscula>` esteja importada ou definida ali dentro. No `AGENTS.md`
> corrigido: `11 blocos ts/tsx · 0 problema(s)`, rc=0. Com o defeito
> reintroduzido numa cópia (`actions={<ApplicationDialog />}` de volta):
> `SIMBOLO …:159 <ApplicationDialog> usado sem import nem definição no bloco`,
> rc=1 — o controle negativo falha, como tem de falhar.
>
> **3.1, escopo exato.** O `openspec archive` aplica blocos de requisito, não
> o `## Purpose` — foi por isso que a frase "isolado da experiência de
> terminal do site público" sobreviveu ao arquivamento da bko-01. Aqui foi
> corrigido o `## Purpose` (o delta da 01 somado ao da 05). Os blocos
> ADDED/MODIFIED da própria bko-05 NÃO foram copiados à mão: quem os aplica é
> a etapa de arquivamento, e duplicá-los agora criaria requisito repetido.

## 4. Fechamento

- [x] 4.1 `pnpm lint && env -u DATABASE_URL pnpm build && pnpm test` verdes (o arquivamento das changes 00–04 já aconteceu; o da própria bko-05 é a etapa seguinte a esta caixa, não parte dela)

> Os três comandos, reexecutados depois das correções desta passagem (o
> conserto do vazamento na célula de empresa dos contatos, a descoberta de id
> em tempo de execução na régua e o `scripts/a11y-fixtures.mjs` novo):
> `pnpm lint` exit 0 (0 errors e os mesmos 2 warnings
> `react-hooks/set-state-in-effect` pré-existentes, em `theme-provider.tsx`;
> `check-dictionaries: 2 files, 336 keys, in sync`;
> `check-admin-utilities: 152 arquivos varridos, 25 tokens vigiados, nenhum
> vazamento`) · `env -u DATABASE_URL pnpm build` exit 0 · `pnpm test` exit 0,
> **33 arquivos / 280 testes** (eram 32/277 antes da bko-04 entrar).
>
> Reexecutados de novo depois da correção do `AGENTS.md` desta passagem (a
> receita §4.1 sem componente fantasma e a §5 reancorada em
> `submitKeepingValues`): `pnpm lint` exit 0 (0 errors, os mesmos 2 warnings
> `react-hooks/set-state-in-effect` em `theme-provider.tsx`;
> `check-dictionaries: 2 files, 336 keys, in sync`; `check-admin-utilities:
> 152 arquivos varridos, 25 tokens vigiados, nenhum vazamento`) ·
> `pnpm test` exit 0, **33 arquivos / 280 testes** · `env -u DATABASE_URL
> pnpm build` exit 0. Mudança de documentação não move nenhum dos três, e é
> exatamente isso que os números mostram.
>
> Sobre o texto que esta caixa tinha: ele mandava "arquivar as changes 00–05",
> e isso nunca coube aqui. As **00–04 já estão** em
> `openspec/changes/archive/` (a bko-04 foi fechada e arquivada em `9175870`);
> a **bko-05 é arquivada pela etapa de fechamento que vem DEPOIS desta
> caixa** — uma change não pode registrar em si mesma o próprio arquivamento
> sem mentir sobre a ordem. Por isso o texto da tarefa agora fala só dos três
> comandos.
>
> FIXTURES E LIMPEZA (o que esta passagem deixou automatizado). A varredura
> precisa de três coisas que o `pnpm db:seed:demo` NÃO cria: um usuário com
> senha conhecida para logar, um `Project` e uma `Generation` para as rotas de
> detalhe, e uma `ApiKey` para a listagem. Elas eram quatro linhas feitas à
> mão no Postgres de dev — estado que ninguém consegue repetir nem remover com
> confiança. Agora são `scripts/a11y-fixtures.mjs`, nos dois sentidos:
>
> ```sh
> export $(grep '^DATABASE_URL=' .env.local | xargs)
> export A11Y_PW="$(node -e 'console.log(require("crypto").randomBytes(18).toString("base64url"))')"
> node scripts/a11y-fixtures.mjs up          # cria/atualiza as 4 linhas
> pnpm dev &                                 # 5050
> ADMIN_EMAIL=a11y-audit@local.test ADMIN_PASSWORD="$A11Y_PW" \
>   node scripts/a11y-admin-axe.mjs          # e --width 390 --height 844, --keyboard, --motion
> node scripts/a11y-fixtures.mjs down        # remove tudo o que o `up` criou
> ```
>
> A senha nunca é impressa nem gravada: entra por `A11Y_PW` e sai como hash
> bcrypt. `up` é idempotente (upsert por id); `down` apaga `ApiKey`,
> `Generation`, `Project`, o usuário e os contadores `login:%` de
> `McpRateLimit` que as próprias passagens acumularam, e confere que o usuário
> sumiu. O script RECUSA rodar contra `DATABASE_URL` que não seja localhost:
> o usuário que ele cria é um admin de verdade dentro do banco em que roda.
> Ida e volta conferidas nesta passagem: `down` → `apiKey 1 · generation 1 ·
> project 1 · user 1 · loginThrottle 1`; `up` → as quatro de volta;
> `--only projects` depois disso → 3 superfícies, 0 violação, exit 0.
> Estado do Postgres de dev ao final desta passagem: **limpo** (`down`
> executado por último). Quem for rodar a régua de novo começa pelo `up`.
>
> Atenção ao rodar em sequência: o login tem trava de 10 tentativas por 15 min
> por IP e cada passagem gasta uma. Entre as passagens desta sessão foi
> preciso soltar o contador com
> `delete from "McpRateLimit" where bucket like 'login:%';` — que é exatamente
> o que o `down` faz por último.

> Arquivos novos desta change, para quem for commitar:
> `scripts/check-admin-utilities.ts` (a guarda de 2.1, esta sim dentro do
> `pnpm lint`), `scripts/a11y-admin-axe.mjs` (a régua) e
> `scripts/a11y-fixtures.mjs` (as fixtures). Os dois últimos são auditoria
> manual contra o dev server: não entram no lint nem no build.
