# `/admin` — receita única do backoffice

Este arquivo é **normativo** para tudo sob `src/app/admin/**`, `src/app/_actions/**` e
`src/components/admin/**`. Ele existe porque o backoffice é um port dos padrões de um **admin de
referência** privado (projeto de cliente sob NDA, fora deste repositório; nome e caminho ficam de
fora de propósito — este repositório é público) que usa **TanStack Query + `useMutation` +
`invalidateQueries`**, para um app **Next 16 App Router com Server Actions**. Os dois
modelos resolvem o mesmo problema de formas diferentes. **Não misture os dois.** Não instale TanStack Query.
Não crie rotas REST paralelas.

Se você está prestes a escrever `useQuery`, `useMutation`, `fetch("/api/admin/...")` ou `useEffect` para
carregar dados: pare e leia a tabela abaixo.

---

## 0. Regras que não se negociam

| # | Regra |
|---|---|
| A1 | **Todo `page.tsx` sob `/admin` começa com o guard.** `const session = await auth(); if (!session?.user) redirect("/admin/login");` Não há middleware: `src/proxy.ts` exclui `/admin` do matcher de propósito. Página nova sem guard = área administrativa aberta, e o repositório é **público**. |
| A2 | **Toda Server Action começa com `await requireAdmin()`.** Sem exceção, inclusive as de leitura. |
| A3 | **`next build` roda sem `DATABASE_URL`.** Todo caminho que toca o banco checa `dbConfigured` de `@/lib/db` e degrada (lista vazia + aviso), nunca lança. Isso vale para `generateStaticParams`, `sitemap`, ISR e qualquer coisa avaliada no build. |
| A4 | **Interface em português e inglês, sem prefixo no endereço.** O idioma é um cookie do backoffice, depois o do site, depois o do navegador (`@/lib/admin/locale`); quem resolve é o servidor, em `@/lib/admin/request`, e a troca fica no menu da conta. Texto fixo mora na chave **`admin`** de `src/dictionaries/*.json`, nos dois idiomas (`pnpm lint` cobra a paridade): `getAdminLabels()` no servidor, e só as palavras necessárias vão por prop para o cliente; as palavras comuns (fechar, cancelar, `(obrigatório)`, o pager, os estados de lista) chegam por `useCommonLabels()`, e a palavra de cada valor de enum (estágio, visto, situação…) está em `admin.vocab`. **Nenhuma página do site carrega essa chave** (`getDictionary` a tira). Tela traduzida passa `translated` ao `AdminShell`; a que ainda não foi traduzida (visão geral, dossiê, editor de projeto) fica marcada em pt-BR (`Untranslated`), e o que ela abre em portal herda a marca. Action chamada por tela traduzida escreve a `message` com `getAdminLabels()`. O que Marco digitou nunca é traduzido |
| A5 | **Nunca `toLocaleString`/`toLocaleDateString` solto, e nunca um formatador montado na tela.** `@/lib/format` só exporta `createFormat({ locale, timeZone })`; quem escolhe os dois é a requisição. No Server Component, `const { formatDate } = await getAdminFormat()` (`@/lib/admin/request`); no Client Component, `useAdminFormat()` (`@/components/admin/admin-locale`); componente síncrono que serve aos dois recebe `format: Format` por prop. Servidor e navegador recebem os mesmos dois valores como dado, e é isso que evita hydration mismatch. Regra de escolha: **`formatDate` para data de calendário** (`appliedAt`, datas do vault, qualquer coisa que veio de um `<input type="date">` — são gravadas como meia-noite **UTC** e por isso são lidas em UTC, qualquer que seja o fuso) e **`formatDateTime` para timestamp de sistema** (`createdAt`, `updatedAt`, logs — instantes reais, exibidos no **fuso configurado**, São Paulo por padrão). Trocar os dois causa erro de um dia. |
| A6 | **Nenhum primitivo caseiro, e os de `ui/` já são hologramas.** Nas telas, botão, campo, select, tabela, janela e confirmação vêm de `@/components/ui/*` (shadcn, style `radix-lyra`), vestidos pelo desenho do site: `Button` desenha a moldura de `@/components/holo` (`default` é o primário; `destructive` tem a moldura de erro e um ícone ao lado do verbo), `Input`, `Textarea` e `SelectTrigger` a moldura de campo, `Dialog` e `AlertDialog` a janela, todos na fonte de texto do site. A estrutura (`@/components/admin/shell`) e o login usam `@/components/holo` direto. Se faltar um primitivo, `pnpm dlx shadcn@latest add <nome>` e vista-o como os outros. **O CSS do holograma é de módulo, fora de `@layer`, e vence qualquer utility de `display` ou `position` posta num `Button`:** para esconder ou posicionar um, envolva-o |
| A7 | **Cores: só as do tema.** Use os tokens shadcn (`bg-card`, `text-muted-foreground`, `border-border`) e os de texto do site (`text-ok`, `text-warn`, `text-ink-3`, `text-beam-2`). Os VALORES estão em `src/app/admin/admin.css`, sob `body.admin-root`, e apontam para os tokens dos três temas (`src/app/site.css`): **nenhuma cor literal, nenhuma da escala do Tailwind e nenhuma da Versão CLI** (`text-green`, `var(--purple)`…), que existem no `:root` mas não mudam com o tema. `scripts/check-admin-colors.ts` roda dentro de `pnpm lint` e aponta o arquivo; as exceções (papel do gerador, monograma e gradiente do projeto) estão em `@/lib/admin/color-audit`, com o motivo. `text-brand` é o feixe: só no que se clica, e `bg-accent` é fundo de hover. **Nenhum alfa em texto**, e preenchimento translúcido novo entra em `TINTS` de `@/lib/admin/contrast-audit`, que `scripts/check-contrast.ts` mede nos três temas (4.5:1 para texto, 3:1 para borda de controle). **O vocabulário shadcn só existe dentro de `.admin-root`**: fora de `src/app/admin`, `src/components/ui` e `src/components/admin` a utility resolve para nada, e `scripts/check-admin-utilities.ts` reprova. |
| A8 | **Um só `<Toaster/>`**, já montado em `src/app/admin/layout.tsx`: uma região viva educada, que existe antes de qualquer aviso. O resultado de uma ação é um **aviso**, por `useNotify()` (`@/components/admin/notify`): `success`/`error`/`info`/`warning(frase, { detail, action })`, que desenha um `HoloNotice` sólido, com botão de dispensar, que some sozinho, é lido uma vez e diz o idioma da tela que o chamou. **Nunca `toast.*` do sonner direto**: o `Toaster` é `unstyled` e só empilha `HoloNotice` |
| A9 | **Campo claro.** Todo campo tem `<Label htmlFor>` visível, que é o nome acessível (filtro também). Obrigatoriedade é `<RequiredHint />` dentro do `Label` — `(obrigatório)` / `(required)`, nunca um `*`. Ajuda é `<FieldHelp id>` e erro é `<FieldError id>` (`role="alert"`, a frase em `--ink` e o ícone em `--bad`), os dois ligados ao campo por `aria-describedby` (`describedBy`), todos de `@/components/admin/field-output`. A frase do erro diz o que houve e como corrigir, e vem do dicionário: nunca a mensagem crua do zod. Depois de uma recusa o foco vai ao primeiro campo com problema (`useFocusFirstInvalid`, `@/components/admin/form-submit`); falha do servidor é aviso sem detalhe interno, com "Tentar de novo" |
| A10 | **O botão diz o que faz.** O rótulo é o verbo com o objeto, inicial maiúscula e sem colchetes ("Salvar contato", "Excluir candidatura", "Gerar materiais"), e o aviso de sucesso usa o mesmo verbo ("Contato salvo."). Botão só de ícone tem `aria-label` e `title` com a ação e o registro ("Editar a candidatura Acme") |
| A11 | **Excluir pede o nome digitado.** Excluir (e revogar uma chave) passa por `<ConfirmDelete>` (`@/components/admin/confirm-delete`): a janela diz o que se perde, o botão destrutivo só liga com o nome exato, "Cancelar" tem o foco quando ela abre, e `Esc` cancela e devolve o foco a quem a abriu. A action recebe `(id, digitado)`; uma recusa deixa a janela aberta e oferece tentar de novo. Esse freio não pode ser enfraquecido |
| A12 | **Lista é tabela, lida pelo servidor.** `<Table>` com `<TableHead scope="col">`, sem cartão em volta. A ordem é um `<SortableHead>` (o `aria-sort` no `<th>`, um link que muda `?sort=&dir=`; `parseSort`/`sortHref` de `@/lib/admin/sort`), aplicada no banco como os filtros e a página; página além do fim mostra a última (conte antes de paginar). A linha que abre um registro é `<OpensRow href>` (página) ou `<OpensRow>` com `data-row-open` no botão que abre a janela; o teclado chega ao mesmo registro pelo `<RowLink>` ou pelo botão da linha. Os quatro estados — carregando, nenhum registro, nada para o filtro, falha — são `<TableStateRow>`/`<StateMessage>`, cada um com a ação seguinte (criar, limpar os filtros, tentar de novo); falha nunca diz que a lista está vazia. Abaixo de 768 px só ficam as colunas essenciais (`hidden md:table-cell` nas outras). Estágio é `<StageLabel>` (nome e marca da fase); situação é a palavra do dicionário com `<StatusWord>` |
| A13 | **Atalho que não se anuncia não existe.** O pager escreve a tecla no próprio botão (`<kbd>N</kbd>`, `aria-keyshortcuts`), e o nome do botão é a palavra que se vê; o quadro escreve "← →" acima dos cartões e cada cartão aponta para essa frase (`aria-describedby`). Nenhum atalho de uma letra dispara em campo de texto (`isEditableTarget`), com uma janela aberta ou com modificador, e o `preventDefault` acontece mesmo com a ação nula. Não existe overlay de `?` e não deve passar a existir |
| A15 | **Formulário do painel submete por `onSubmit={(event) => submitKeepingValues(event, fn)}`** (`@/components/admin/form-submit`), **nunca** `action={fn}` com função de cliente. O React 19 reseta o `<form>` ao fim de QUALQUER função de `action`: no caminho de erro isso apagava todos os campos não controlados, e a tela pedia para "conferir os campos destacados" que ela mesma tinha esvaziado (medido em `scripts/smoke-admin-write.mjs`, bko-04). Exceção, de propósito: quem passa uma **Server Action direta** — `application-form.tsx` (`useActionState`, campos controlados) e `login-form.tsx` — fica com `action=`, porque ali o reset é o contrato documentado e o formulário funciona sem JS. Quem quer limpar no sucesso chama `form.reset()`. Os diálogos levam `noValidate`: o erro que se vê é o da tela, junto do campo, e não o balão do navegador. Detalhes e prova em §5.3; `form-submit.test.tsx` trava a regressão no CI. |
| A14 | **Animação respeita `prefers-reduced-motion: reduce`.** A regra global de `globals.css` colapsa `animation-duration`/`transition-duration` para 0.01ms com `!important` e força uma iteração, então uma animação nova precisa ser legível **no último quadro** — é ele que fica na tela. A barra `.admin-progress` foi desenhada assim de propósito (revelada por `clip-path`, último quadro = barra cheia). Verifique com `node scripts/a11y-admin-axe.mjs --motion`, cujo controle negativo é `--motion no-preference`. |

---

## 1. Mapeamento do admin de referência → Next

| admin de referência (TanStack Query) | aqui (Next 16 + Server Actions) |
|---|---|
| `useQuery({ queryKey, queryFn })` | **Server Component `async`** lendo o Prisma direto. Não existe fetch no cliente. |
| `queryKey: ["apps", { page, status }]` | **`searchParams` da URL.** A URL é a query key. Filtro e página são estado de servidor, não `useState`. |
| `isLoading` | `loading.tsx` ou `<Suspense fallback={…}>` → `<TableStateRow state="loading">`. |
| `isError` | `try/catch` no Server Component (ou `!dbConfigured`) → `<TableStateRow state="failed">` com "Tentar de novo". |
| `useMutation({ mutationFn })` | **Server Action** (`"use server"`) chamada dentro de `startTransition`. |
| `mutation.isPending` | `isPending` de `useTransition()`. |
| `onSuccess: () => toast.success(…)` | `notify.success(…)` (`useNotify`) no cliente, **depois** do `await` da action. |
| `onError: () => toast.error(…)` | a action **retorna** `{ ok: false, message }`; o cliente decide o aviso. Não use `throw`. |
| `queryClient.invalidateQueries({ queryKey })` | **`revalidatePath("/admin/…")`** dentro da action (servidor). O RSC payload é refeito sozinho ao fim da transition. |
| `navigate({ search: { page, sort } })` | `router.push("?" + params)` dentro de `startTransition`; a ordem é um link do cabeçalho (`sortHref`). |
| `<Outlet/>` + `AppShell` | `{children}` + `AdminShell` (`@/components/admin/admin-shell`) — é ele que põe o menu, o topo e o caminho em volta da tela. |

**A consequência prática mais importante:** não há cache no cliente para invalidar. Quem invalida é o
servidor, via `revalidatePath`. Se a lista não atualizou depois de salvar, é porque faltou `revalidatePath`
na action — não porque falta um refetch no cliente.

---

## 2. O contrato de retorno das actions

Toda action **nova** retorna este tipo. Crie o arquivo no primeiro uso e importe daí em diante:

```ts
// src/app/_actions/action-result.ts
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
```

Regras:

- **Nunca `throw`** numa action consumida pela UI: o erro vira uma tela de erro genérica e o aviso some.
  Capture, logue no servidor (`console.error("[admin] …", safeDbError(err))`) e devolva
  `{ ok: false, message }`.
- **Nunca logue o `err` cru.** Num erro de validação o Prisma embute o `data` da chamada na própria
  mensagem — salário alvo, nota de recrutador, CV gerado — e isso vai parar no log do container.
  Use `safeDbError(err)` de `@/lib/safe-error`: nome da classe + código (`P2002`) + modelo, nada mais.
  (`_actions/contacts.ts` e `admin/contacts/contacts-query.ts` ainda têm uma cópia local chamada
  `safeError`; equivalente, pendente de consolidação.)
- **`message` é texto pronto para o aviso**, no idioma da tela que chama: pt-BR nas que ainda não foram
  traduzidas, `getAdminLabels()` nas que já foram. Não devolva código de erro cru.
- **Nunca vaze detalhe interno** (stack, SQL, e-mail de outro usuário) no `message`.
- `fieldErrors` é `{ [nome do campo]: mensagem }`, montado a partir de `zod`.

> **Legado:** `src/app/_actions/admin-projects.ts` e `applications.ts` ainda usam o tipo antigo
> `AppActionState` (`{ status: "idle" | "success" | "error"; errors; message }`) com `useActionState` e
> `redirect()` no sucesso. Não replique esse formato em código novo. Ao migrar essas telas, converta para
> `ActionResult`.

### `redirect()` — a armadilha

`redirect()` **lança** uma exceção de controle do Next. Portanto:

- **nunca** dentro de `try { … } catch { … }` (o catch engole o redirect e a navegação não acontece);
- uma action que faz `redirect()` **nunca retorna** — logo o cliente **não consegue dar `notify.success`**
  depois dela.

Por isso a receita de Dialog abaixo **não redireciona**: ela retorna `{ ok: true }`, o cliente fecha o
dialog e mostra o aviso, e a lista se atualiza pelo `revalidatePath`. Use `redirect()` só quando a ação
troca de página de verdade (ex.: criar um recurso e ir para o detalhe dele) — e, nesse caso, o feedback é a
própria navegação, e a página que recebe diz o resultado num aviso (`ResultNotice`).

---

## 3. Layout canônico da página

```tsx
<AdminShell email={email} translated>
  <div className="space-y-6 font-text">
    <PageHeader
      title={words.title}
      description={words.description}
      actions={
        <Button asChild>
          <Link href="/admin/applications/new">
            <Plus aria-hidden="true" />
            {words.create}
          </Link>
        </Button>
      }
    />
    {/* filtros (rascunho → aplicado, SEM debounce) + Table + pager, SEM cartão */}
  </div>
</AdminShell>
```

`font-text` na raiz da tela redesenhada: o corpo do backoffice ainda é monoespaçado para as telas que não
foram redesenhadas (visão geral, dossiê, editor de projeto), e os primitivos já escolhem a fonte deles.

**A ação do cabeçalho: rota ou `Dialog`?** Formulário longo mora em rota própria — a candidatura tem ~15
campos, e o cabeçalho aponta para `/admin/applications/new` com `<Button asChild><Link/></Button>`.
`Dialog` (§5) é para entidade curta, editada sem sair da lista: contato, referência, chave de API.

**O `PageHeader` traz o único `<h1>` da tela, à vista.** Não existe botão "voltar": a saída é o menu e, numa
tela dentro de outra, o caminho que a estrutura desenha acima do conteúdo (`trail` em `@/lib/admin/nav`).
Página de um registro passa o nome dele em `<AdminShell name={…}>`, que é a última parte do caminho.

Convenções de célula: data e número em `font-label` (Cascadia Code, os rótulos e dados tabulares de
`docs/design/fundamentos.md`); texto que pode estourar a coluna leva `truncate` na célula com `max-w-0` e o
valor inteiro no `title`; ícone dentro de botão é `aria-hidden` e o tamanho vem do botão.

**Ordem obrigatória dos estados da lista** (A12):

1. carregando → `<TableStateRow state="loading">` no `fallback` do `Suspense` (a barra é estática sob
   `prefers-reduced-motion: reduce`; a frase é o que o leitor recebe)
2. falha → `state="failed"` com "Tentar de novo" (`currentHref`); sem `DATABASE_URL`, a frase
   `common.states.noDatabase`, sem ação
3. nada para o filtro → `state="filtered"` com "Limpar filtros" (`clearedHref`)
4. nenhum registro → `state="empty"`, com a ação de criar quando a tela cria
5. dados → `rows.map(…)`, cada linha um `<OpensRow>` quando abre um registro

---

## 4. Receita (a) — listar com paginação **server-side**

Nunca filtre/pagine no cliente: filtrar um `findMany()` inteiro no navegador não escala para o radar
(~191 vagas) e perde a página ao recarregar. A URL é a fonte da verdade: filtros, página e ordem.

A implementação de referência **existe no repositório**: `src/app/admin/applications/page.tsx` (a página),
`applications-toolbar.tsx` (filtros + pager) e `@/lib/applications-query` (`parseApplicationFilters`,
`parsePage`, `listApplications` com `skip`/`take`, `APPLICATION_SORT_KEYS`). Uma lista simples (busca e um ou
dois selects) usa `<ListFilters>` (`@/components/admin/list-filters`) no lugar de uma toolbar própria — é o
caso do assistente, da auditoria e das chaves.

O esqueleto da página:

```tsx
export const dynamic = "force-dynamic"; // guard + searchParams: nunca prerenderize

export default async function Page({ searchParams }: PageProps<"/admin/applications">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1
  const params = await searchParams;
  const filters = parseApplicationFilters(params);
  const page = parsePage(params.page);
  const sort = parseSort(params, APPLICATION_SORT_KEYS, DEFAULT_APPLICATION_SORT);
  const labels = await getAdminLabels();
  return (
    <AdminShell email={session.user.email ?? "admin"} translated>
      <ApplicationsToolbar {...filters} words={…} page={page} sort={sort} position="top" />
      <Suspense key={applicationsQueryKey(filters, page, sort)} fallback={<Table>…loading…</Table>}>
        <Rows filters={filters} page={page} sort={sort} labels={labels} />
      </Suspense>
    </AdminShell>
  );
}
```

E as linhas, no componente suspenso:

```tsx
const result = await listApplications({ filters, page, sort }); // conta antes: página além do fim → a última
// estados na ordem da §3, depois:
<OpensRow key={row.id} href={`/admin/applications/${row.id}`}>
  <TableCell className="max-w-0">
    <RowLink href={`/admin/applications/${row.id}`} title={companyName} className="truncate">
      {companyName}
    </RowLink>
  </TableCell>
  <TableCell><StageLabel stage={row.stage} words={labels.vocab} /></TableCell>
  <TableCell className="hidden md:table-cell">…</TableCell>
</OpensRow>
// e embaixo, o mesmo client component em position="bottom": o TablePager
```

Um único client component é dono da URL. Ele recebe os valores atuais **por prop** (vindos do Server
Component) — não use `useSearchParams`, que obriga a um `<Suspense>` e reintroduz estado duplicado. O que
se digita é rascunho até "Filtrar", sem debounce; qualquer mudança de filtro volta para a página 1, e trocar
de página mantém filtros e ordem.

> `<SelectItem value="">` é proibido pelo Radix (string vazia é reservada para "sem valor"). Use uma
> sentinela como `"all"` e converta na borda.

O `TablePager` escreve "74 registros · Página 2 de 4" e os botões "Anterior P" / "Próxima N", e liga
`n`/`p` no `document` (A13). Duas consequências para quem monta uma tela nova:

- **o pager só funciona dentro de um Client Component.** Ele recebe `onPageChange` e registra um listener;
  importá-lo de um Server Component é erro de compilação. O resto do módulo (`TableStateRow`,
  `StateMessage`) é marcação pura e continua no servidor — por isso `table-pager.tsx` **não** tem
  `"use client"` no topo.
- **não duplique o pager de cima e o de baixo como componentes diferentes.** Duas instâncias montam dois
  listeners para a mesma tecla; o caso real (`position: "top" | "bottom"`) devolve o `TablePager` só numa
  das duas.

**O quadro** (`/admin/applications/board`) é a mesma leitura em seis colunas (`BOARD_COLUMNS` em
`@/lib/admin/funnel`): contagem real por coluna (`groupBy`), teto de cartões por coluna com o resto contado,
arrastar e `←`/`→` pelo teclado, a mudança mostrada na hora (`useOptimistic`) e desfeita sozinha se o
servidor recusa, e o aviso de sucesso com "Desfazer". Ver `@/components/admin/kanban/kanban-board.tsx`.

---

## 5. Receita (b) — criar/editar em `Dialog`

Um só componente para os dois casos: sem `initial` é criação, com `initial` é edição.

A implementação de referência **existe no repositório**: `src/app/_actions/contacts.ts` (`saveContact`) +
`src/app/admin/contacts/contact-dialog.tsx` (`ContactDialog`). Quando este texto e o arquivo divergirem, o
arquivo ganha — e esta seção é corrigida junto.

> **Quando NÃO usar Dialog.** Formulário longo mora em rota própria: a candidatura tem ~15 campos e vive em
> `/admin/applications/new` + `/admin/applications/[id]/edit`, com `useActionState` e `redirect()` no
> sucesso (§5.3); a lista que recebe o redirecionamento diz o resultado num aviso (`ResultNotice`).

### 5.1 A action

- Começa com `requireAdmin()` (A2) e checa `dbConfigured` (A3).
- As palavras vêm de `getAdminLabels()`, no idioma da tela que chama (A4).
- O zod valida sem mensagem própria: `fieldErrors` é `{ [campo]: frase do dicionário }`, por campo
  (`fieldErrorsOf(error, words.errors)`), com `message = common.checkFields`.
- Violação de `@@unique` vira erro **de campo** (`P2002`), não aviso genérico.
- Qualquer outra falha: `console.error("[admin] …", safeDbError(err))` e `{ ok: false, message: words.failed }`
  — a frase diz o que houve, sem detalhe interno.
- Sucesso: `revalidatePath` e `{ ok: true, message: words.saved }`, com o verbo do botão.

### 5.2 O dialog

```tsx
const notify = useNotify();
const common = useCommonLabels();
const [errors, setErrors] = useState<Record<string, string>>({});
const form = useRef<HTMLFormElement>(null);
useFocusFirstInvalid(form, errors); // a recusa leva o foco ao primeiro campo com problema

function onSubmit(formData: FormData) {
  startTransition(async () => {
    const result = await saveContact(initial?.id ?? null, formData).catch(() => ({ ok: false, message: common.failed }));
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      if (result.fieldErrors) notify.error(result.message);
      else notify.error(result.message, { action: { label: common.retry, onClick: () => form.current?.requestSubmit() } });
      return;
    }
    setErrors({});
    setOpen(false); // fecha só no sucesso
    notify.success(result.message ?? words.saved);
  });
}

<DialogContent className="sm:max-w-2xl">
  <form ref={form} noValidate onSubmit={(event) => submitKeepingValues(event, onSubmit)} className="grid gap-6">
    <DialogHeader>
      <DialogTitle>{initial ? words.editTitle : words.newTitle}</DialogTitle>
      <DialogDescription>{words.description}</DialogDescription>
    </DialogHeader>
    <div className="space-y-2">
      <Label htmlFor="contact-name">
        {f.name}
        <RequiredHint />
      </Label>
      <Input
        id="contact-name"
        name="name"
        defaultValue={initial?.name ?? ""}
        className="w-full"
        aria-invalid={Boolean(errors.name)}
        aria-describedby={describedBy(errors.name && "contact-name-error")}
      />
      <FieldError id="contact-name-error">{errors.name}</FieldError>
    </div>
    <DialogFooter>
      <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{common.cancel}</Button>
      <Button type="submit" disabled={isPending}>{isPending ? common.saving : words.save}</Button>
    </DialogFooter>
  </form>
</DialogContent>
```

A janela é o holograma de painel (`AdminWindow` dentro de `ui/dialog.tsx`): prende o foco, fecha com `Esc`,
com o botão do canto (nome `common.close`) e com clique fora, e devolve o foco a quem a abriu. O que rola é
o corpo, dentro da moldura.

Palavras de um diálogo renderizado em cada linha (o de edição) não viajam por prop em cada linha: a página
entrega uma vez por um provider (`CompanyOptionsProvider` em `src/app/admin/contacts/company-options.tsx`).

### 5.3 `onSubmit` e não `action=` — o reset invisível do React 19 (A15)

**O que esta seção ensinava errado** — o código deixou de fazer isso na bko-04. ERRADO, não copie:

```tsx
{/* ERRADO: action recebe uma função do cliente — o React reseta o form ao fim dela. */}
<form action={onSubmit}>{/* … */}</form>
```

**O React 19 reseta o `<form>` assim que a função de `action` termina — qualquer função**, Server Action ou
não. Medido em `scripts/smoke-admin-write.mjs`: depois de uma recusa, todos os campos não controlados do
diálogo voltavam vazios, e a tela pedia para conferir campos que ela mesma tinha apagado.

**A correção.** `onSubmit={(event) => submitKeepingValues(event, onSubmit)}`. O `preventDefault()` tira o
formulário do fluxo de ação do React, e é o reset desse fluxo que estamos evitando. O handler recebe o mesmo
`FormData` que o `action=` entregaria.

- **É `(event, handler)`, não uma fábrica `handler => onSubmit`.** A fábrica seria CHAMADA durante a
  renderização, e o lint do React Compiler reprova qualquer função criada assim que possa tocar num `ref`.
- **Não se perde realce progressivo:** uma função DE CLIENTE não roda sem JS.
- **Quem fica com `action=`, de propósito:** `src/components/admin/application-form.tsx` (via
  `useActionState`, com todos os campos controlados — é o que os mantém depois de uma recusa) e
  `src/components/admin/login-form.tsx`.
- **Quem QUER limpar depois do sucesso chama `form.reset()`** (a troca de senha).
- **O CI trava isso:** `src/components/admin/form-submit.test.tsx` tem o controle negativo ao lado da prova,
  mais o caso de ponta a ponta no `ContactDialog` (o que foi digitado fica, o foco vai ao campo com erro).

**Por que `useTransition` e não `useActionState` nos diálogos:** com `startTransition(async …)` o resultado
está na mão, na mesma função, para fechar o diálogo e dar o aviso. Reserve `useActionState` para formulário
de página inteira que redireciona no sucesso.

---

## 6. Receita (c) — excluir com confirmação forte

Confirmação forte = a pessoa **digita o nome exato** do registro (A11). Nada de `confirm()` do navegador. O
componente é `<ConfirmDelete>` (`@/components/admin/confirm-delete`), e pode ser usado direto do Server
Component, dentro do `rows.map()`:

```tsx
import { deleteApplication } from "@/app/_actions/applications";

<ConfirmDelete
  id={row.id}
  name={companyName}
  title={fill(words.delete.title, { name: companyName })}   // "Excluir a candidatura Acme?"
  lost={words.delete.lost}                                  // o que vai junto
  confirmLabel={words.delete.confirm}                       // "Excluir candidatura"
  triggerLabel={fill(words.delete.trigger, { name: companyName })}
  action={deleteApplication}
/>
```

A action **retorna** `ActionResult` (não `void`, senão não há aviso de falha) e recebe `(id, digitado)` —
quem precisa conferir o nome de novo no servidor confere (`revokeApiKey`). Revogar uma chave usa o mesmo
componente com `icon={Ban}`.

> **Por que `action={deleteApplication}` e não `onConfirm={() => deleteApplication(row.id)}`:** um Server
> Component **não pode** passar uma função arbitrária para um Client Component — a arrow function não é
> serializável. Uma **referência a Server Action** é: o Next manda um id e o cliente chama de volta. Por isso
> o `id` viaja como prop separada, e o componente compõe `action(id, digitado)` do lado do cliente.

---

## 7. Receita (d) — avisos

```tsx
const notify = useNotify();

notify.success(words.saved);                                          // "Contato salvo."
notify.error(result.message, { action: { label: common.retry, onClick: retry } });
notify.success(fill(board.moved, { name, column }), { action: { label: common.undo, onClick: undo } });
```

- O `<Toaster />` já está em `src/app/admin/layout.tsx` (A8). Não monte outro, não chame `toast.*` do sonner.
- **Aviso é só do cliente.** Server Action não dá aviso — ela devolve `message` e quem chama decide. Quando
  a action redireciona, a página que recebe mostra o resultado com `<ResultNotice>` e o tira da URL.
- Uma frase, com ponto final, no idioma da tela (A4). **Sucesso silencioso é bug:** toda mutação confirmada
  dá aviso de sucesso; toda falha, de erro, com "Tentar de novo" quando tentar de novo faz sentido.

---

## 8. Checklist antes de abrir a PR da tela

- [ ] `auth()` + `redirect("/admin/login")` no topo do `page.tsx` (A1) e `requireAdmin()` em toda action (A2).
- [ ] `dbConfigured` checado; a página renderiza sem `DATABASE_URL` (A3). Confirme com
      `env -u DATABASE_URL pnpm build`.
- [ ] Filtro, página e ordem na **URL**, paginação no **banco**, página além do fim mostra a última (A12).
- [ ] Os estados da lista na ordem da §3, cada um com a ação seguinte.
- [ ] Linha que abre registro: `OpensRow` + `RowLink` (ou botão com `data-row-open`).
- [ ] Formulário com `onSubmit` + `submitKeepingValues`, `useFocusFirstInvalid`, erros do dicionário (A9, A15).
- [ ] Botões com verbo e objeto, aviso com o mesmo verbo (A10); exclusão por `ConfirmDelete` (A11).
- [ ] `revalidatePath` em toda action que escreve; `useNotify` em toda mutação (A8).
- [ ] Nenhum `<SelectItem value="">`, nenhum `toLocaleDateString`, nenhum primitivo caseiro (A5, A6).
- [ ] Texto fixo no dicionário, nos dois idiomas; palavras de valores em `admin.vocab`; `AdminShell translated` (A4).
- [ ] Datas e números por `getAdminFormat`/`useAdminFormat` (A5); nenhuma cor fora do tema (A7).
- [ ] Rota nova que já está no `NAV` de `@/lib/admin/nav`: troque o `href: null` ("em breve") pelo endereço.
- [ ] Rota nova que não está: acrescente-a ao `NAV` (ou a `SECTIONS`), o nome nos dois dicionários e o
      ícone em `shell/icons.ts`.
- [ ] Atalho novo escrito na tela, e inativo em campo de texto (A13).
- [ ] Animação nova legível no último quadro; conferida com `node scripts/a11y-admin-axe.mjs --motion` (A14).
- [ ] Varredura de acessibilidade da rota nova:
      `ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/a11y-admin-axe.mjs --only <rota>`
      e a mesma coisa com `--keyboard`, `--width 390`, nos três temas (`--theme`) e nos dois idiomas (`--lang`).
- [ ] A estrutura continua de pé: `node scripts/e2e-site.mjs --admin` em 390, 1024 e 1440 px. Rota nova entra em
      `SCREENS` de `scripts/e2e-admin.mjs`.
- [ ] `pnpm lint` e `env -u DATABASE_URL pnpm build` verdes.

---

## 9. Inventário do que já existe

| Arquivo | O que oferece |
|---|---|
| `src/components/admin/admin-shell.tsx` | `AdminShell({ email, name?, translated?, children })` — a estrutura em volta da tela, e a marca de idioma da que ainda não foi traduzida |
| `src/components/admin/shell/*` | a estrutura: menu em grupos e recolhível (`side-menu`), barra do celular (`phone-bar`), busca (`search-button`, `search-window`), `create-menu`, `account-menu`, caminho (`trail`), tudo em `shell.module.css` |
| `src/components/admin/admin-locale.tsx` | `AdminLocaleProvider` (um, no layout) · `useAdminFormat` · `useCommonLabels` (as palavras comuns, no idioma da tela) · `useWrittenLanguage` · `Untranslated` · `Translated` · `useScreenLanguage` |
| `src/lib/admin/nav.ts` | `NAV` (menu; `href: null` = em breve) · `CREATE` · `SHORTCUTS` · `currentItem(pathname)` · `trail(pathname, name?)` |
| `src/lib/admin/search.ts` | o que a busca acha: telas, ações e candidaturas · `_actions/search.ts` entrega as candidaturas, só quando a busca abre |
| `src/lib/admin/request.ts` | **(`server-only`)** `getAdminSettings` (idioma e fuso da requisição) · `getAdminFormat` · `getAdminLabels` |
| `src/lib/admin/locale.ts` · `time-zone.ts` | quais idiomas e fusos, os cookies e como se resolvem |
| `src/lib/admin/text.ts` | `fill(frase, valores)` (`{nome}` → valor) · `counted({ one, many }, n)` |
| `src/lib/admin/sort.ts` | `parseSort` · `sortHref` · `clearedHref` · `currentHref` — a ordem e os endereços de uma lista |
| `src/lib/admin/funnel.ts` | `phaseOf(estágio)` · `BOARD_COLUMNS` (as seis colunas do quadro e o estágio de cada uma ao soltar) · `columnOf` · `neighbourColumn` |
| `src/components/admin/page-header.tsx` | `PageHeader({ title, description?, actions?, className? })` — `title` é o `<h1>` da tela |
| `src/components/admin/table-pager.tsx` | `TablePager` (página, total, teclas `n`/`p` escritas nos botões) · `TableStateRow` · `StateMessage` · `isEditableTarget` · `TableLoadingRow`/`TableEmptyRow` (só para a visão geral e o dossiê, até rebrand-10/11) |
| `src/components/admin/listing.tsx` · `opens-row.tsx` | `SortableHead` · `RowLink` · `OpensRow` |
| `src/components/admin/list-filters.tsx` | `ListFilters` — busca e selects rotulados, na URL, com o pager embaixo |
| `src/components/admin/filter-panel.tsx` | `FilterPanel` — os filtros atrás de um botão no celular |
| `src/components/admin/stage.tsx` | `StageLabel` (nome + marca da fase) · `PhaseMark` |
| `src/components/admin/status-word.tsx` · `figures.tsx` | `StatusWord` (situação por extenso, com a marca de cor) · `Figures` (números sem caixa) |
| `src/components/admin/view-switch.tsx` | `ViewSwitch` — lista ou quadro, com a vista atual marcada |
| `src/components/admin/kanban/*` | o quadro: `KanbanBoard` (arrastar, setas, desfazer), `KanbanColumn`, `KanbanCard`, `kanban-types` |
| `src/components/admin/form-submit.ts` | `submitKeepingValues(event, handler)` (A15) · `useFocusFirstInvalid(form, errors)` |
| `src/components/admin/field-output.tsx` | `FieldHelp` · `RequiredHint` · `FieldError` · `describedBy` (A9) |
| `src/components/admin/confirm-delete.tsx` | `ConfirmDelete` — excluir ou revogar com o nome digitado (A11) |
| `src/components/admin/notify.tsx` · `result-notice.tsx` | `useNotify` (A8) · `ResultNotice` (o resultado que chegou pela URL) |
| `src/app/admin/admin.css` | os VALORES dos tokens shadcn, apontando para os do tema · a moldura de campo e de select · a janela · a tabela e o link da linha · `.admin-kbd` · `.admin-progress` · o piso de `:focus-visible` |
| `scripts/a11y-admin-axe.mjs` | varredura das rotas + overlays: axe-core (padrão), `--keyboard`, `--motion`, `--width 390`, `--theme`, `--lang` |
| `scripts/e2e-admin.mjs` | os casos de `node scripts/e2e-site.mjs --admin`: entrada, tema, idioma, menu, busca, teclado, foco, celular, impressão, a coluna de ações das chaves e o quadro |
| `scripts/check-admin-utilities.ts` · `check-admin-colors.ts` | as guardas do `pnpm lint`: o vocabulário shadcn não sai do admin, e nenhuma cor de fora do tema entra (A7) |
| `src/components/admin/status-badge.tsx` | **legado**: as etiquetas `[valor]` do dossiê e da visão geral, até rebrand-10/11 |
| `src/lib/format.ts` | `createFormat({ locale, timeZone })` → `formatDate` (data de calendário, UTC) · `formatDateTime` (instante, fuso configurado) · `formatMoney` · `formatNumber` · `formatPercent` · e, sem idioma: `toDateInputValue` · `EMPTY` (`"—"`) |
| `src/components/ui/*` | os primitivos shadcn (style `radix-lyra`), vestidos como hologramas (A6) |
| `src/lib/db.ts` | `db` (PrismaClient) e `dbConfigured` |
| `src/lib/auth.ts` | `auth()` |
| `src/lib/applications.ts` | **(cliente)** `FUNNEL_STAGES` · `FUNNEL_STAGE_PHASES` · `SENT_STAGES` · `INTERVIEW_STAGES` · `SPONSORSHIP_SIGNALS` · `SPONSORSHIP_ROUTES` · `APPLICATION_SOURCES` · `slugPart` · `buildFolderName` (os rótulos pt-BR que ainda moram aqui servem ao dossiê e ao MCP; a tela traduzida lê `admin.vocab`) |
| `src/lib/applications-query.ts` | **(`server-only`)** `parseApplicationFilters` · `parsePage` · `buildApplicationWhere` · `listApplications` (ordem por `APPLICATION_SORT_KEYS`) · `listApplicationMarkets` · `listApplicationSources` · `effectiveSponsorship`/`effectiveMarket` · `APPLICATIONS_PAGE_SIZE` |
