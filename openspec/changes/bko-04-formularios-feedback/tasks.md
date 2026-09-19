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

- [ ] 1.3 `attach:` no upload de imagem do formulário de projeto, mostrando o arquivo escolhido; verificar upload real ponta a ponta
  - Implementado (`CoverImageField` em `src/components/admin/project-form.tsx`): rótulo `attach: imagem de capa`, texto nativo do navegador apagado com `text-transparent`, linha de saída `attach: <arquivo>` em região viva, com `· enviando…` durante o POST.
  - Verificado em navegador real (`DOM.setFileInputFiles` com um PNG de verdade no `<input type="file">`): a `<p aria-live="polite">` **já existe antes da escolha** (`"attach: (nenhum arquivo)"`, com o prefixo `attach: ` em `aria-hidden`) e passa a `"attach: capa-de-verificacao.png"` depois dela. O POST saiu para a rota real `/api/admin/upload`.
  - O caminho de sucesso (pré-visualização + toast `Imagem enviada.`) está coberto em jsdom por `project-form.test.tsx`, com a API respondendo `200 {url}`.
  - **Caixa fica aberta**: o POST real volta `401` sem sessão de admin, então o par escolher-arquivo → gravar em `UPLOAD_DIR` → a capa aparecer no card **não foi percorrido inteiro por mim**. Falta só essa perna, e ela exige sessão.

## 2. Ações

- [x] 2.1 Rótulos em colchetes nos botões de `ui/button.tsx` e nas telas; verificar que nenhum botão ficou com colchete duplicado ou sem
  - Convenção documentada em `src/components/ui/button.tsx` e como regra A10 do `src/app/admin/AGENTS.md`. Colchetes são texto do `<button>` (um `bracket` prop foi descartado: o `asChild` entrega os filhos a um `Slot`, que exige elemento único).
  - Verificação: varredura sobre todo `<Button>`/`<AlertDialogAction>`/`<AlertDialogCancel>` de `src/app/admin`, `src/components/admin` e `src/components/ui` — **88 rótulos entre colchetes, 0 fora do padrão, 0 com colchete duplicado**, e 20 botões só de ícone (sem rótulo visível). Fora da convenção, de propósito: os quatro segmentados de aba/rota (`aria-pressed`, pintados por estado desde a bko-03).

- [ ] 2.2 Tema do `Toaster` como linha de saída; verificar sucesso e erro numa ação real (criar candidatura, depois forçar falha) e confirmar anúncio por região viva
  - Implementado: `src/components/ui/sonner.tsx` (marcadores `✓`/`✗` como texto `aria-hidden` no slot `icons`, `richColors` removido, canto inferior direito, superfície `--popover` / borda `--line` / texto `--fg`) + as regras de cor do marcador em `src/app/admin/admin.css`. `src/app/admin/layout.tsx` deixou de passar props de tema.
  - **O toast desenhado foi verificado**, em Chrome real com o CSS compilado do app. Medido no `<li data-sonner-toast>`:
    - sucesso: `data-type="success"`, marcador `✓` dentro de nó `aria-hidden`, texto `Candidatura “Acme” excluída.`;
    - erro: `data-type="error"`, marcador `✗`, texto `Não foi possível enviar a imagem.`;
    - superfície `rgb(33,34,44)` = `--popover`, texto `rgb(246,246,244)` = `--fg`, borda `rgb(54,57,73)` = `--line`, `border-radius: 0px`, fonte `Cascadia Code`; marcador `rgb(98,232,132)` = `--green` no sucesso e `rgb(242,139,139)` = `--destructive` no erro;
    - **região viva confirmada**: o toast nasce dentro de `<section aria-live="polite">`;
    - o `✓` não entra no nome acessível do item (`{"name":"","description":"","role":"listitem"}`).
  - **Caixa fica aberta** por causa do "numa ação real": o toast de erro veio de uma ação real (POST de verdade na rota real, `401`, ramo de erro do componente), mas o de **sucesso** veio da mesma árvore de componentes com o resultado da Server Action dublado — sem sessão não dá para criar uma candidatura de verdade no navegador. Cruzar com 4.1.

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

- [ ] 4.1 Smoke de escrita: criar/editar/excluir candidatura, projeto e contato; mover estágio no board; gerar CV — cada um com toast correto
  - **Bloqueado.** Nenhuma extensão do Chrome conectada e nenhuma credencial de admin disponível: `.env.local` traz `ADMIN_PASSWORD=` vazio. Fabricar uma senha para a linha de `User` do banco de dev não é coisa que o agente faça por conta própria, então o smoke autenticado não foi tentado nesta rodada. Caixa fica aberta.
  - O que **foi** percorrido sem sessão, em navegador real: o ciclo do diálogo de exclusão até a chamada da action (3.1), o upload até o POST na rota real (1.3) e os dois toasts desenhados (2.2).

- [x] 4.2 `pnpm lint && env -u DATABASE_URL pnpm build && pnpm test` verdes
  - `pnpm lint`: `✖ 2 problems (0 errors, 2 warnings)` — as duas são pré-existentes (`react-hooks/set-state-in-effect` em `boot-overlay.tsx:82` e `theme-provider.tsx:43`, ambos fora desta change). `check-dictionaries: 2 files, 336 keys, in sync`.
  - `env -u DATABASE_URL pnpm build`: `✓ Compiled successfully in 7.0s`, `✓ Generating static pages (34/34)`.
  - `pnpm test`: `Test Files 32 passed (32)`, `Tests 277 passed (277)` (eram 27/242 antes da change; ela acrescentou 5 arquivos e 35 testes).
  - `npx tsc --noEmit`: sem saída, código 0.
  - Os quatro comandos foram executados nesta rodada, depois da última edição de código.
