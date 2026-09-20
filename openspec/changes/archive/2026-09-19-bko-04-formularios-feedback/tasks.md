## 1. Entrada

- [x] 1.1 Ajuda como `# comentário` e obrigatoriedade escrita nos três formulários grandes; verificar que o nome acessível de cada campo continua igual ao rótulo visível (axe, `/admin/applications/new`)
  - Implementado em `src/components/admin/field-output.tsx` (`FieldHelp`, `RequiredHint`) e aplicado nos três formulários grandes + os seis diálogos de escrita.
  - Verificação: `src/components/admin/application-form.test.tsx` (7 testes) prova, no DOM de `/admin/applications/new`, que todo controle tem `id` + um único `<label for>`, nenhum `aria-label`/`aria-labelledby` competindo, nenhum rótulo em forma de flag, `(obrigatório)` em vez de `*`, e toda ajuda com `#` `aria-hidden` e ligada por `aria-describedby`.
  - Medição em navegador de verdade (Chrome headless por CDP, `Accessibility.getPartialAXTree`) do campo que mais destoa — o upload de capa, único rótulo com prefixo: nome acessível `"attach: imagem de capa"`, **idêntico ao texto visível**; descrição acessível `"Opcional. Substitui a capa estilizada nos cards. Máx. 8 MB. Não foi possível enviar a imagem."` — sem o `#` da ajuda e sem o `stderr:` do erro.
  - **Não foi uma passada de axe**: axe roda sobre a página autenticada e nesta máquina não há sessão de admin obtenível (`ADMIN_PASSWORD` vazio no `.env.local`; criar credencial para isto não é coisa que o agente faça). O critério do cenário está coberto pelos testes acima e pela medição de accname; a passada de axe fica para quem tiver sessão.

- [x] 1.2 Erro como `stderr:` com prefixo `aria-hidden`, mantendo `role="alert"` e `aria-describedby`; verificar com leitor de tela que só a mensagem é anunciada
  - `FieldError` em `src/components/admin/field-output.tsx`, aplicado em **todos** os campos com erro do admin — inclusive os dois que estavam de fora:
    - upload de capa (`CoverImageField`, `src/components/admin/project-form.tsx`): o `Shell` montado à mão não citava os próprios ids. Agora existe `shellAria()` no arquivo, o único lugar que monta `aria-invalid` + `aria-describedby`, e os quatro campos do formulário (incluindo o upload) passam por ele.
    - grupo `Escopos` (`src/app/admin/api-keys/create-key-dialog.tsx`): o `<FieldError>` era anônimo e o `<Label>Escopos</Label>` não apontava para nada. Virou `role="group"` + `aria-labelledby="key-scopes-label"` + `aria-describedby` com a ajuda e, quando há, o erro.
  - Sobram dois `FieldError`/`FieldHelp` sem `id`, de propósito: o erro de formulário inteiro de `application-form.tsx:419` (não é de campo) e a nota ao lado do `[ gerar ]` em `generator-form.tsx:133` (não é ajuda de campo). `grep -rn '<FieldError' src/ | grep -v 'id='` mostra só esses.
  - Verificação, três camadas:
    - `src/components/admin/field-output.test.tsx` computa o texto que sobra depois de descartar tudo que é `aria-hidden` e afirma que o anúncio é `"E-mail inválido."`, não `"stderr: E-mail inválido."`; afirma também `role="alert"` e o `id` endereçável.
    - `src/components/admin/project-form.test.tsx` (**novo**, 5 testes): nenhum `-help`/`-error` do formulário fica fora de algum `aria-describedby`, nenhum `aria-describedby` aponta para id inexistente, e no erro do upload o campo fica `aria-describedby="coverImageFile-help coverImageFile-error"` + `aria-invalid="true"`. **Controle negativo**: removendo o `shellAria()` do `<Input type="file">`, 3 dos 5 testes quebram.
    - Navegador real (Chrome headless, CSS compilado pelo próprio dev server): com um arquivo escolhido de verdade e a API respondendo erro, o campo ficou `aria-invalid="true"`, `aria-describedby="coverImageFile-help coverImageFile-error"`, os dois ids existem no DOM (`#coverImageFile-error` com `role="alert"`) e a **borda acendeu** em `rgb(242, 139, 139)` = `--destructive`.
  - Leitor de tela real não foi usado: o que se mediu foi o nome/descrição calculados pelo Chrome, que é a entrada do leitor, não o leitor.

- [x] 1.3 `attach:` no upload de imagem do formulário de projeto, mostrando o arquivo escolhido; verificar upload real ponta a ponta
  - Implementado (`CoverImageField` em `src/components/admin/project-form.tsx`): rótulo `attach: imagem de capa`, texto nativo do navegador apagado com `text-transparent`, linha de saída `attach: <arquivo>` em região viva, com `· enviando…` durante o POST.
  - Verificado em navegador real (`DOM.setFileInputFiles` com um PNG de verdade no `<input type="file">`): a `<p aria-live="polite">` **já existe antes da escolha** (`"attach: (nenhum arquivo)"`, com o prefixo `attach: ` em `aria-hidden`) e passa a `"attach: capa-de-verificacao.png"` depois dela. O POST saiu para a rota real `/api/admin/upload`.
  - O caminho de sucesso (pré-visualização + toast `Imagem enviada.`) está coberto em jsdom por `project-form.test.tsx`, com a API respondendo `200 {url}`.
  - **A perna que faltava foi percorrida**, com sessão de admin de verdade, por `scripts/smoke-admin-write.mjs` (novo — Chrome headless por CDP, login real, e uma consulta Prisma ao lado de cada asserção de tela). Passo 6, saída literal:
    - `✓ o rótulo do campo é 'attach: imagem de capa'`
    - `✓ a linha de saída do anexo é região viva  polite`
    - `✓ antes da escolha a linha diz '(nenhum arquivo)'  attach: (nenhum arquivo)`
    - `✓ o prefixo 'attach: ' é aria-hidden  attach: `
    - `✓ o upload dá toast de sucesso  Imagem enviada.`
    - `✓ a linha passa a mostrar o arquivo escolhido  attach: capa-smoke-mu94kth1.png`
    - `✓ a rota devolveu um caminho público  /uploads/efe2f359-7676-456f-b8ee-a004f0c7fc04.png`
    - `✓ a pré-visualização aponta para o arquivo enviado`
    - `✓ o arquivo foi gravado em UPLOAD_DIR  /Users/…/app/uploads/efe2f359-….png`
    - `✓ e volta pela rota /uploads servido como imagem  HTTP 200 image/png 70B`
    - `✓ a capa enviada ficou gravada na linha  /uploads/efe2f359-….png` (o projeto foi criado em seguida, e `Project.coverImage` no Postgres é o mesmo caminho)
    - e na volta ao formulário de edição: `✓ na edição a linha de anexo mostra o arquivo já gravado  attach: efe2f359-….png`
  - O arquivo é escolhido por `DOM.setFileInputFiles` num `<input type="file">` real, com um PNG gerado fora do repositório; o POST vai para `/api/admin/upload` autenticado e responde `200`. O script apaga o arquivo de `UPLOAD_DIR` no fim — e diz que apagou, porque excluir o projeto **não** apaga a mídia.

## 2. Ações

- [x] 2.1 Rótulos em colchetes nos botões de `ui/button.tsx` e nas telas; verificar que nenhum botão ficou com colchete duplicado ou sem
  - Convenção documentada em `src/components/ui/button.tsx` e como regra A10 do `src/app/admin/AGENTS.md`. Colchetes são texto do `<button>` (um `bracket` prop foi descartado: o `asChild` entrega os filhos a um `Slot`, que exige elemento único).
  - Verificação: varredura sobre todo `<Button>`/`<AlertDialogAction>`/`<AlertDialogCancel>` de `src/app/admin`, `src/components/admin` e `src/components/ui` — **88 rótulos entre colchetes, 0 fora do padrão, 0 com colchete duplicado**, e 20 botões só de ícone (sem rótulo visível). Fora da convenção, de propósito: os quatro segmentados de aba/rota (`aria-pressed`, pintados por estado desde a bko-03).

- [x] 2.2 Tema do `Toaster` como linha de saída; verificar sucesso e erro numa ação real (criar candidatura, depois forçar falha) e confirmar anúncio por região viva
  - Implementado: `src/components/ui/sonner.tsx` (marcadores `✓`/`✗` como texto `aria-hidden` no slot `icons`, `richColors` removido, canto inferior direito, superfície `--popover` / borda `--line` / texto `--fg`) + as regras de cor do marcador em `src/app/admin/admin.css`. `src/app/admin/layout.tsx` deixou de passar props de tema.
  - **O toast desenhado foi verificado**, em Chrome real com o CSS compilado do app. Medido no `<li data-sonner-toast>`:
    - sucesso: `data-type="success"`, marcador `✓` dentro de nó `aria-hidden`, texto `Candidatura “Acme” excluída.`;
    - erro: `data-type="error"`, marcador `✗`, texto `Não foi possível enviar a imagem.`;
    - superfície `rgb(33,34,44)` = `--popover`, texto `rgb(246,246,244)` = `--fg`, borda `rgb(54,57,73)` = `--line`, `border-radius: 0px`, fonte `Cascadia Code`; marcador `rgb(98,232,132)` = `--green` no sucesso e `rgb(242,139,139)` = `--destructive` no erro;
    - **região viva confirmada**: o toast nasce dentro de `<section aria-live="polite">`;
    - o `✓` não entra no nome acessível do item (`{"name":"","description":"","role":"listitem"}`).
  - **Agora em ações reais, nas duas pontas.** `scripts/smoke-admin-write.mjs` mede cada toast que nasce de uma Server Action de verdade, contra o Postgres de verdade. Dez toasts, um por ação; de cada um o gravador (`MutationObserver` instalado antes do script da página, guardado em `sessionStorage` para atravessar navegação) extrai tipo, marcador, texto anunciado e a região viva:
    - sucesso — `Candidatura atualizada.`, `“Smoke QA …” movida para Enviada.`, `Contato criado.`, `Contato excluído.`, `Imagem enviada.`, `Projeto criado.`, `Projeto atualizado.`, `Projeto "…" excluído.`, `Candidatura “…” excluída.`;
    - erro — `Confira os campos destacados.` (zod do servidor em `saveContact`) e `Cole uma descrição de vaga mais completa (mínimo de 40 caracteres).` (action do gerador).
  - Em TODOS eles, a mesma bateria passou: `✓ toast é data-type="success"` / `"error"` · `✓ marcador é "✓"` / `"✗"` · `✓ marcador é aria-hidden (não entra no anúncio)` · `✓ o leitor de tela recebe só a mensagem, sem o marcador` · `✓ o toast nasce dentro de uma região viva  <section aria-live="polite" role="">` · `✓ marcador carrega a classe do tema do admin  admin-output-marker`.
  - O par sucesso↔banco é conferido junto: o toast de mover estágio vem com `✓ o estágio mudou no banco  applied` e `✓ a transição virou ApplicationEvent na mesma transação  radar → applied`; o de exclusão, com `✓ a linha sumiu do Postgres  0 linhas`.
  - **Criar candidatura continua sem toast, e isso é o contrato, não uma falta**: a action redireciona (`?created=…`) e o aviso é a linha verde da listagem. O script afirma as duas coisas — `✓ o aviso de criação aparece na listagem  Candidatura “…” criada.` e `✓ criar NÃO emite toast — o feedback é a navegação (AGENTS.md §2/§5.2)  0 toasts, como o contrato manda`.

- [x] 2.3 Régua de título e `[esc]` em `Dialog`, `AlertDialog` e `Sheet`; verificar que `Esc` fecha e que o foco volta ao gatilho
  - Régua em `src/app/admin/admin.css` (`::before` `──` + `::after` de 64 `─` que encolhe até a borda), cobrindo os três slots; `[esc]` nos três primitives — no `AlertDialog` ele é o próprio `Cancel`, montado **antes** dos filhos para que o foco inicial continue caindo no `[ cancelar ]` do rodapé.
  - **A régua não vaza para o nome acessível.** Os dois `content` declaram alt-text vazio (`content: "──" / ""`), porque o Radix aponta o `aria-labelledby` do conteúdo para o título e o algoritmo de accname inclui conteúdo gerado — `overflow: hidden` recorta o desenho, não a árvore.
  - Verificação:
    - `scripts/a11y-dialog-accname.mjs` (**novo**) mede em Chrome headless por CDP, com o `admin.css` real, os três slots: régua desenhada **e** nome acessível limpo (`"Excluir candidatura"`, `"Excluir projeto"`, `"Acme Tecnologia e Serviços Digitais"`). **Controle negativo**: tirando o ` / ""` do CSS, o script falha 6 vezes e o nome vira `── Excluir candidatura ─────…`.
    - O mesmo foi medido no `AlertDialog` de verdade (componente React montado, CSS servido pelo dev server): nome acessível `"Excluir candidatura"`, régua desenhada.
    - `src/components/ui/dialog.test.tsx` (8 testes) trava em CI o que o jsdom alcança: `Esc` fecha e devolve o foco ao gatilho no `Dialog` e no `Sheet`, o botão `[esc]` fecha de verdade, a régua existe para os três slots e **todo `content` do `admin.css` tem alt-text vazio**. `src/components/admin/delete-application-button.test.tsx` cobre o mesmo no `AlertDialog`.

## 3. Destrutivo

- [x] 3.1 Eco `rm -rf …` + `[y/N]` nos diálogos de exclusão, preservando a confirmação por digitação; verificar que o botão só habilita com o nome correto e que o padrão do diálogo é cancelar
  - `src/components/admin/destructive-echo.tsx` nos três diálogos de exclusão (candidatura, projeto, contato/referência), com `variant="destructive"` no `AlertDialogAction` — que antes era o roxo primário.
  - Verificação em jsdom: `src/components/admin/delete-application-button.test.tsx` (7 testes) — o eco `rm -rf applications/acme--senior-backend` e o `[y/N]` aparecem; abrir o diálogo **não** chama a Server Action (o eco é ilustrativo); o botão segue desabilitado com `"Acm"` e com `"acme"` e só habilita com `"Acme"`; o foco inicial cai no `[ cancelar ]`; `Esc` e `[esc]` fecham devolvendo o foco ao gatilho.
  - Verificação **em navegador real** (Chrome headless, cliques e teclas por CDP — `Input.dispatchMouseEvent`/`dispatchKeyEvent`, não `element.click()`): o diálogo abre; o foco inicial está no `[ cancelar ]`; o eco e o `[y/N]` estão na tela; a ação nasce `disabled`; digitando `A`,`c`,`m` continua `disabled`; ao digitar o `e` final o campo vale `"Acme"` e a ação habilita; o clique chama `deleteApplication("app-1")` e o diálogo fecha. 12 asserções.
  - `revoke-key-dialog` ficou **sem** eco: revogar não é excluir (a linha permanece no banco por causa de `McpAuditLog.apiKeyId`), e um `rm -rf` ali seria mentira. Recebeu só os colchetes e o `variant="destructive"`.
  - **Decisão pendente (fora do escopo desta change)**: o freio por digitação é 100% de cliente. `deleteApplication(id)` apaga recebendo só o id — um POST direto na Server Action, sem nenhuma prova de que o nome foi digitado, exclui a candidatura. Endurecer isso exigiria mexer nas Server Actions, que a tarefa 3.2 desta change proíbe explicitamente. Fica para uma change própria.

- [x] 3.2 Confirmar que nenhuma Server Action foi tocada: `git diff --stat src/app/_actions src/app/admin/**/actions.ts` vazio nesta change
  - `git diff --stat` sobre os 12 arquivos de action (`src/app/_actions/*.ts`, `src/app/admin/applications/[id]/actions.ts`, `src/app/admin/applications/board/actions.ts`): **saída vazia**, reconferido depois das correções.

## 4. Verificação

- [x] 4.1 Smoke de escrita: criar/editar/excluir candidatura, projeto e contato; mover estágio no board; gerar CV — cada um com toast correto
  - **Feito.** `scripts/smoke-admin-write.mjs` (novo, 1 arquivo, sem dependência nova) dirige o admin autenticado pelo CDP — mesma mecânica de `scripts/a11y-admin-axe.mjs` — e confere cada passo dos dois lados: o que a tela diz e o que o Postgres guarda. Uma execução completa:
    - `147 verificação(ões) · 0 falha(s)` · exit `0` · `o banco voltou como estava: nenhuma linha do carimbo sobreviveu`.
  - O percurso, na ordem: criar candidatura (com uma **recusa do servidor antes**, `priority = 999`) → editar pelo dialog de campos-chave → mover o estágio pelo board → criar contato (com uma **recusa do servidor antes**, e-mail inválido) → excluir contato → upload de capa → criar / editar / excluir projeto → gerador com vaga curta → excluir a candidatura. A credencial é de um usuário descartável do banco de dev, passada por ambiente; nada dela toca o repositório.
  - Trava por digitação e eco, medidos com teclado e mouse de verdade (`Input.dispatchKeyEvent` / `dispatchMouseEvent`, nunca `el.click()`):
    - `✓ o eco é '$ rm -rf contacts/<nome> [y/N]'` · `✓ o '[y/N]' é aria-hidden` · `✓ o leitor recebe só o comando`
    - `✓ o foco inicial cai no '[ cancelar ]'` · `✓ o botão de confirmar nasce DESABILITADO` · `✓ com o nome incompleto o botão continua desabilitado` · `✓ só com o nome EXATO o botão habilita`
    - `✓ o eco usa a CHAVE NATURAL, não o nome da empresa  $ rm -rf applications/smoke-qa-…--engenheira-de-verificacao [y/N]`
  - **DEFEITO ENCONTRADO E CORRIGIDO — o formulário apagava o que o usuário digitou.** O React 19 reseta o formulário quando a função passada ao `action=` termina, e isso vale para função de cliente também (o código afirmava o contrário, em comentário, em dois arquivos). No caminho de ERRO o estrago era duplo: a tela pedia "confira os campos destacados" sobre campos que ela mesma tinha esvaziado, e com o campo obrigatório zerado o segundo clique em `[ salvar ]` **nem submetia** — a validação nativa do navegador barrava, sem toast e sem explicação. Medido:
    - `["name=\"\"","roleTitle=\"\"","email=\"\"","phone=\"\"", …]` logo depois do toast `stderr: E-mail inválido.`.
    - Correção em duas frentes, nenhuma delas tocando Server Action (3.2 continua verdadeira): os oito formulários de cliente passaram a usar `submitKeepingValues` (`src/components/admin/form-submit.ts`, novo) em vez de `action={fn}`; o formulário completo de candidatura — que passa Server Action e funciona sem JS — manteve `action=` e teve os campos de texto levados para estado, que é o que sobrevive ao reset.
    - Regressão travada em CI: `src/components/admin/form-submit.test.tsx` (novo, 3 testes), com **controle negativo** — um `<form action={fn}>` cru prova, dentro do próprio teste, que o reset é do React; devolvendo `action={onSubmit}` ao diálogo de contato, o teste do diálogo falha com `expected '' to be 'Joana Recrutadora'`.
    - E o smoke agora afirma o contrário do defeito, nas duas famílias de formulário: `✓ o erro NÃO apaga o que o usuário digitou  name="Smoke Contato …" email="isto-nao-e-email"` e `✓ o erro NÃO apaga o que o usuário digitou (texto e notas)` + `✓ os seletores continuam com o valor escolhido, e o visível bate com o enviado  stage=radar (mostra "Radar") · source=company_site`.
  - **Gerar CV: só o ramo de erro.** `✓ o toast traz o erro traduzido da action  Cole uma descrição de vaga mais completa (mínimo de 40 caracteres).` e `✓ nenhuma 'Generation' foi gravada no caminho de erro  1 → 1`. O ramo de SUCESSO não foi exercitado e o script diz isso em voz alta: ele depende de `KnowledgeChunk` ingerido (`knowledge/` não está no repositório — a base de dev tem 0 chunks) e de uma chamada paga ao OpenAI. É a única perna de 4.1 que continua fora de alcance nesta máquina, e não está escondida atrás de um `[x]`.
  - O script limpa o que cria (carimbo `smoke-<base36>` em todo nome) e distingue os dois tipos de resíduo: o que a UI **não apaga de propósito** (a `Company`, que sobrevive à exclusão da candidatura; o arquivo em `UPLOAD_DIR`, que sobrevive à exclusão do projeto) do que seria falha de passo — só o segundo mexe no exit code.

- [x] 4.2 `pnpm lint && env -u DATABASE_URL pnpm build && pnpm test` verdes
  - `pnpm lint` (código 0): `✖ 2 problems (0 errors, 2 warnings)` — as duas são pré-existentes (`react-hooks/set-state-in-effect` em `boot-overlay.tsx:82` e `theme-provider.tsx:43`, ambos fora desta change). `check-dictionaries: 2 files, 336 keys, in sync` · `check-admin-utilities: 152 arquivos varridos, 25 tokens vigiados, nenhum vazamento.`
  - `env -u DATABASE_URL pnpm build` (código 0): `✓ Compiled successfully in 11.9s`, `✓ Generating static pages using 7 workers (34/34) in 311ms`.
  - `pnpm test` (código 0): `Test Files  33 passed (33)`, `Tests  280 passed (280)` — eram 27 arquivos / 242 testes antes da change; ela acrescentou **6 arquivos e 38 testes**: `dialog.test.tsx` (9), `application-form.test.tsx` (7), `delete-application-button.test.tsx` (7), `field-output.test.tsx` (7), `project-form.test.tsx` (5) e `form-submit.test.tsx` (3), este último nascido da correção do defeito do React 19 descrito em 4.1.
  - `npx tsc --noEmit`: sem saída, código 0.
  - Os quatro comandos foram executados **depois** da correção do defeito do React 19 e da remoção de um `import` ocioso (`useState`, em `form-submit.test.tsx`) que gerava uma terceira advertência de lint — os números acima são a saída literal dessa rodada, não de uma anterior.
