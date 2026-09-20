# `/admin` — receita única do backoffice

Este arquivo é **normativo** para tudo sob `src/app/admin/**`, `src/app/_actions/**` e
`src/components/admin/**`. Ele existe porque o backoffice é um port dos padrões do
um admin de referência privado (fora deste repositório) — que usa **TanStack Query +
`useMutation` + `invalidateQueries`** — para um app **Next 16 App Router com Server Actions**. Os dois
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
| A4 | **UI em pt-BR.** Rótulos, botões, toasts, mensagens de erro, cabeçalho de tabela. |
| A5 | **Nunca `toLocaleString`/`toLocaleDateString` solto.** Use `@/lib/format`. Locale e time zone estão pinados lá justamente para não haver hydration mismatch. Regra de escolha: **`formatDate` para data de calendário** (`appliedAt`, datas do vault, qualquer coisa que veio de um `<input type="date">` — são gravadas como meia-noite **UTC** e por isso são lidas em UTC) e **`formatDateTime` para timestamp de sistema** (`createdAt`, `updatedAt`, logs — instantes reais, exibidos em America/Sao_Paulo). Trocar os dois causa erro de um dia. |
| A6 | **Nenhum primitivo caseiro.** Botão, input, tabela, dialog, badge, select vêm de `@/components/ui/*` (shadcn, style `radix-lyra`). Se faltar um, `pnpm dlx shadcn@latest add <nome>` — não escreva à mão. |
| A7 | **Cores:** use os tokens shadcn (`bg-card`, `text-muted-foreground`, `border-border`, `bg-sidebar`). O azul da marca é **`text-brand` / `bg-brand`**, *não* `bg-accent` (que no shadcn é o fundo de hover). Nunca reatribua `--muted`, `--accent` ou `--border` no `globals.css`. **Esse vocabulário só existe dentro de `.admin-root`:** os NOMES são declarados no `@theme inline` de `globals.css` e os VALORES em `src/app/admin/admin.css` (bko-01). Fora de `src/app/admin`, `src/components/ui` e `src/components/admin` a utility resolve para nada — um painel invisível em produção, não um erro de compilação. `scripts/check-admin-utilities.ts` roda dentro de `pnpm lint` e reprova o CI (bko-05). No site público use os nomes da paleta: `bg-bg`, `text-fg`, `text-comment`, `border-line`. |
| A8 | **Um só `<Toaster/>`**, já montado em `src/app/admin/layout.tsx`. Não registre outro. |
| A9 | **Ajuda, obrigatoriedade e erro de campo vêm de `@/components/admin/field-output`** (`FieldHelp`, `RequiredHint`, `FieldError`, `describedBy`) — nunca um `<p className="text-xs text-destructive">` solto. O `#` e o `stderr:` são `aria-hidden`; o erro carrega `role="alert"` e um `id` que o campo referencia por `aria-describedby`. Obrigatoriedade é `(obrigatório)` escrito dentro do `<Label>`, nunca um `*`. |
| A10 | **Botão com texto visível escreve o rótulo entre colchetes** — `[ salvar ]`, `[ cancelar ]`, `[ excluir definitivamente ]`, em minúsculas. Os colchetes são **texto do `<button>`**, não `::before`/`::after`. Fora da regra, de propósito: botão só de ícone (o nome vem do `aria-label`), `variant="link"`, e os segmentados de aba/rota que carregam `aria-pressed` — ali o estado já é pintado. |
| A11 | **Diálogo de exclusão ecoa o comando equivalente** com `<DestructiveEcho command="rm -rf …" />` e usa `variant="destructive"` no `AlertDialogAction`. O eco é **ilustrativo**: não existe comando por trás e nenhuma change deve tentar "fazer funcionar". A confirmação por digitação do nome exato (§6) continua sendo o freio real e não pode ser enfraquecida. |
| A12 | **Listagem é saída de `ls`, e a pintura mora no CSS.** A tabela continua `<table>/<thead>/<th scope="col">` — `<pre>` destruiria cabeçalho, associação célula↔coluna e navegação por tabela no leitor de tela. Quem transforma o desenho é a classe `admin-listing`, aplicada UMA vez dentro de `@/components/ui/table.tsx`; nenhuma página a escreve. A listagem **não** fica dentro de `<Card>` (a bko-03 tirou o cartão). Cabeçalho em minúsculas e sem acento (`empresa`, `vaga`, `estagio`, `acoes`), largura em `ch` no `<th>` e `table-fixed` no `<Table>` quando as larguras existem. A coluna decorativa de índice (`001`, `002`…) vem de `ListingIndexHead`/`ListingIndexCell` e é `aria-hidden`: é âncora visual, não o id. |
| A13 | **Atalho que não se anuncia não existe.** Toda tecla ligada numa rota aparece escrita na própria linha da ação — a paginação mostra `[n]ext` / `[p]rev`, e o nome acessível do botão **começa pelo rótulo visível** (`"[n]ext — Próxima página (tecla n)"`): a SC 2.5.3 (Label in Name) exige que o texto visível esteja contido no nome acessível, senão comando por voz não alcança o botão. Não existe overlay de `?` e não deve passar a existir. O `useListingShortcut` do `TablePager` é o único atalho de uma letra do admin; se um novo aparecer, ele copia a mesma regra de guarda (`isEditableTarget`, nenhum modificador, `preventDefault` mesmo com ação nula). |
| A15 | **Formulário do painel submete por `onSubmit={(event) => submitKeepingValues(event, fn)}`** (`@/components/admin/form-submit`), **nunca** `action={fn}` com função de cliente. O React 19 reseta o `<form>` ao fim de QUALQUER função de `action`: no caminho de erro isso apagava todos os campos não controlados, e a tela pedia para "conferir os campos destacados" que ela mesma tinha esvaziado (medido em `scripts/smoke-admin-write.mjs`, bko-04). Exceção, de propósito: quem passa uma **Server Action direta** — `application-form.tsx` (`useActionState`) e `login-form.tsx` — fica com `action=`, porque ali o reset é o contrato documentado e o formulário funciona sem JS. Quem quer limpar no sucesso chama `form.reset()`. Detalhes e prova em §5.3; `form-submit.test.tsx` trava a regressão no CI. |
| A14 | **Animação respeita `prefers-reduced-motion: reduce`.** A regra global de `globals.css` colapsa `animation-duration`/`transition-duration` para 0.01ms com `!important` e força uma iteração, então uma animação nova precisa ser legível **no último quadro** — é ele que fica na tela. A barra `.admin-progress` foi desenhada assim de propósito (revelada por `clip-path`, último quadro = barra cheia). Verifique com `node scripts/a11y-admin-axe.mjs --motion`, cujo controle negativo é `--motion no-preference`. |

---

## 1. Mapeamento admin de referência → Next

| admin de referência (TanStack Query) | aqui (Next 16 + Server Actions) |
|---|---|
| `useQuery({ queryKey, queryFn })` | **Server Component `async`** lendo o Prisma direto. Não existe fetch no cliente. |
| `queryKey: ["apps", { page, status }]` | **`searchParams` da URL.** A URL é a query key. Filtro e página são estado de servidor, não `useState`. |
| `isLoading` | `loading.tsx` ou `<Suspense fallback={…}>` → renderiza `TableLoadingRow`. |
| `isError` | `try/catch` no Server Component (ou `!dbConfigured`) → `TableEmptyRow destructive`. |
| `useMutation({ mutationFn })` | **Server Action** (`"use server"`) chamada dentro de `startTransition`. |
| `mutation.isPending` | `isPending` de `useTransition()`. |
| `onSuccess: () => toast.success(…)` | `toast.success(…)` no cliente, **depois** do `await` da action. |
| `onError: () => toast.error(…)` | a action **retorna** `{ ok: false, message }`; o cliente decide o toast. Não use `throw`. |
| `queryClient.invalidateQueries({ queryKey })` | **`revalidatePath("/admin/…")`** dentro da action (servidor). O RSC payload é refeito sozinho ao fim da transition. |
| `navigate({ search: { page } })` | `router.push("?" + params)` dentro de `startTransition`. |
| `<Outlet/>` + `AppShell` | `{children}` + `AdminShell` (`@/components/admin/admin-shell`) — é ele que veste o chrome de terminal. |

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

- **Nunca `throw`** numa action consumida pela UI: o erro vira uma tela de erro genérica e o toast some.
  Capture, logue no servidor (`console.error("[admin] …", err)`) e devolva `{ ok: false, message }`.
- **`message` é texto pt-BR pronto para o toast.** Não devolva código de erro cru.
- **Nunca vaze detalhe interno** (stack, SQL, e-mail de outro usuário) no `message`.
- `fieldErrors` é `{ [nome do campo]: mensagem }`, montado a partir de `zod`.

> **Legado:** `src/app/_actions/admin-projects.ts` e `applications.ts` ainda usam o tipo antigo
> `AppActionState` (`{ status: "idle" | "success" | "error"; errors; message }`) com `useActionState` e
> `redirect()` no sucesso. Não replique esse formato em código novo. Ao migrar essas telas, converta para
> `ActionResult`.

### `redirect()` — a armadilha

`redirect()` **lança** uma exceção de controle do Next. Portanto:

- **nunca** dentro de `try { … } catch { … }` (o catch engole o redirect e a navegação não acontece);
- uma action que faz `redirect()` **nunca retorna** — logo o cliente **não consegue dar `toast.success`**
  depois dela.

Por isso a receita de Dialog abaixo **não redireciona**: ela retorna `{ ok: true }`, o cliente fecha o
dialog e mostra o toast, e a lista se atualiza pelo `revalidatePath`. Use `redirect()` só quando a ação
troca de página de verdade (ex.: criar um recurso e ir para o detalhe dele) — e, nesse caso, o feedback é a
própria navegação, sem toast.

---

## 3. Layout canônico da página

```tsx
<div className="space-y-4">
  <PageHeader
    title="Candidaturas"
    description="Funil de vagas. O banco é canônico — o Obsidian não recebe nada de volta."
    actions={
      <Button asChild size="sm">
        <Link href="/admin/applications/new">
          <Plus className="size-4" />
          [ nova candidatura ]
        </Link>
      </Button>
    }
  />
  {/* filtros: draft → applied, SEM debounce */}
  <div className="space-y-3">{/* toolbar + Table + TablePager, SEM cartão */}</div>
  {/* dialogs no final do arquivo */}
</div>
```

**A ação do cabeçalho: rota ou `Dialog`?** Formulário longo mora em rota própria — a candidatura
tem ~15 campos, e o cabeçalho aponta para `/admin/applications/new` com
`<Button asChild><Link/></Button>`, como acima (é o que
`src/app/admin/applications/page.tsx` faz hoje). `Dialog` (§5) é para entidade curta, editada sem
sair da lista: contato, referência, chave de API.

Convenções de célula: números com `tabular-nums`, ícone dentro de botão sempre `className="size-4"`.
Nada de `font-mono`: o admin inteiro já é monoespaçado.

**A listagem é saída de comando** (bko-03). A `<table>` continua sendo uma `<table>` — o visual vem da
classe `.admin-listing`, aplicada uma vez dentro de `ui/table.tsx`. O que cada listagem precisa fazer:

- `<Table className="table-fixed">` e uma largura em `ch` (`w-[24ch]`) em todo `<TableHead>` que não seja
  a coluna de texto livre. Sem o par `table-fixed` + `ch`, o alinhamento monoespaçado não se sustenta.
- `<ListingIndexHead />` no cabeçalho e `<ListingIndexCell index={i} />` como primeira célula de cada
  linha — a coluna `001`, `002`… é decorativa (`aria-hidden`) e **conta no `colSpan`**: `COLS` inclui ela.
- Cabeçalho em minúsculas e sem acento (`estagio`, `acoes`): é nome de coluna de saída, não título.
- Valor de enum vai como `[valor_cru]` via `StatusBadge`; o rótulo em pt-BR viaja no `title`.
- Texto que pode estourar a coluna leva `title` com o valor inteiro — a célula trunca com reticências.

**Ordem obrigatória dos estados da tabela** (a mesma do admin de referência, traduzida para RSC):

1. carregando → `<TableLoadingRow cols={N} />` — uma linha de progresso em blocos, estática sob
   `prefers-reduced-motion: reduce` (dentro do `fallback` do `Suspense`/`loading.tsx`)
2. erro / `!dbConfigured` → `<TableEmptyRow cols={N} destructive message="…" />`
3. vazio → `<TableEmptyRow cols={N} />`, que escreve `# nenhum registro`
4. dados → `rows.map((row, index) => …)` — o `index` alimenta `<ListingIndexCell />`

---

## 4. Receita (a) — listar com paginação **server-side**

Nunca filtre/pagine no cliente: filtrar um `findMany()` inteiro no navegador não escala para o radar
(~191 vagas) e perde a página ao recarregar. A URL é a fonte da verdade — `parseApplicationFilters` e
`parsePage` (de `@/lib/applications-query`, `server-only`) leem os `searchParams`, e `listApplications`
aplica `skip`/`take` no Prisma.

### 4.1 A página (Server Component)

```tsx
// src/app/admin/applications/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteApplicationButton } from "@/components/admin/delete-application-button";
import { PageHeader } from "@/components/admin/page-header";
import {
  LISTING_INDEX_WIDTH,
  ListingIndexCell,
  ListingIndexHead,
  TableEmptyRow,
} from "@/components/admin/table-pager";
import { FunnelStageBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { ApplicationsToolbar } from "./applications-toolbar";

export const dynamic = "force-dynamic"; // guard + searchParams: nunca prerenderize

const PAGE_SIZE = 20;
// A12: a coluna de índice entra na conta do `colSpan` das linhas de estado.
const COLS = 6;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function ApplicationsPage({
  searchParams,
}: PageProps<"/admin/applications">) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A1

  const sp = await searchParams; // Next 16: searchParams é Promise
  const stage = one(sp.stage);
  const q = one(sp.q);
  const page = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const where = {
    ...(stage ? { stage } : {}),
    ...(q ? { company: { name: { contains: q, mode: "insensitive" as const } } } : {}),
  };

  // A3: sem DATABASE_URL o build não pode explodir.
  let rows: Awaited<ReturnType<typeof db.application.findMany>> = [];
  let total = 0;
  let failed = false;
  if (dbConfigured) {
    try {
      [rows, total] = await Promise.all([
        db.application.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        db.application.count({ where }),
      ]);
    } catch (err) {
      console.error("[admin] list applications failed", err);
      failed = true;
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell email={session.user.email ?? "admin"}>
      <div className="space-y-4">
        {/* O formulário de candidatura é longo demais para um Dialog: a ação
            do cabeçalho é um link para a rota de criação (§3). */}
        <PageHeader
          title="Candidaturas"
          description={`${total} registro(s) no funil.`}
          actions={
            <Button asChild size="sm">
              <Link href="/admin/applications/new">
                <Plus className="size-4" />
                [ nova candidatura ]
              </Link>
            </Button>
          }
        />

        {/* A12: SEM <Card>. A listagem é saída de comando, e saída de comando
            não mora numa caixa — a bko-03 tirou o cartão de todas as listas. */}
        {/* filtros + pager vivem no mesmo client component: ambos escrevem na URL */}
        <ApplicationsToolbar
          stage={stage}
          q={q}
          page={page}
          totalPages={totalPages}
          total={total}
          position="top"
        />

        {/* `table-fixed` só porque os <th> abaixo declaram largura em `ch`:
            é o que promove a largura à lei da coluna e faz o nome comprido
            truncar em vez de empurrar as outras colunas. */}
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <ListingIndexHead />
              <TableHead>empresa</TableHead>
              <TableHead>vaga</TableHead>
              <TableHead className="w-[24ch]">estagio</TableHead>
              <TableHead className="w-[18ch]">aplicado</TableHead>
              <TableHead className="w-[14ch] text-right">acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {failed || !dbConfigured ? (
              <TableEmptyRow
                cols={COLS}
                destructive
                message="Não foi possível carregar as candidaturas."
              />
            ) : rows.length === 0 ? (
              <TableEmptyRow cols={COLS} />
            ) : (
              rows.map((r, i) => (
                <TableRow key={r.id}>
                  <ListingIndexCell index={(page - 1) * PAGE_SIZE + i} />
                  <TableCell className="font-medium">{r.company}</TableCell>
                  <TableCell className="text-muted-foreground">{r.role ?? "—"}</TableCell>
                  <TableCell><FunnelStageBadge status={r.stage} /></TableCell>
                  <TableCell className="tabular-nums">{formatDate(r.appliedAt)}</TableCell>
                  <TableCell className="text-right">
                    <DeleteApplicationButton
                      id={r.id}
                      company={r.company}
                      folderName={r.folderName}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <ApplicationsToolbar
          stage={stage}
          q={q}
          page={page}
          totalPages={totalPages}
          total={total}
          position="bottom"
        />
      </div>
    </AdminShell>
  );
}
```

### 4.2 A toolbar (Client Component) — filtros draft→applied + `TablePager`

Um único client component é dono da URL. Ele recebe os valores atuais **por prop** (vindos do Server
Component) — não use `useSearchParams`, que obriga a um `<Suspense>` e reintroduz estado duplicado.

```tsx
// src/app/admin/applications/applications-toolbar.tsx
"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { TablePager } from "@/components/admin/table-pager";
import { APPLICATION_STATUS_STYLES } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  status: string;
  q: string;
  page: number;
  totalPages: number;
  total: number;
  position: "top" | "bottom";
}

export function ApplicationsToolbar(p: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // "draft": o que está digitado. Só vira URL no submit — SEM debounce (regra F0).
  const [draftQ, setDraftQ] = useState(p.q);
  const [draftStatus, setDraftStatus] = useState(p.status);

  function apply(next: { q?: string; status?: string; page?: number }) {
    const params = new URLSearchParams();
    const q = next.q ?? draftQ;
    const status = next.status ?? draftStatus;
    const page = next.page ?? 1; // qualquer mudança de filtro volta para a página 1
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  if (p.position === "bottom") {
    return (
      <TablePager
        page={p.page}
        totalPages={p.totalPages}
        total={p.total}
        disabled={isPending}
        onPageChange={(page) => apply({ page })}
      />
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2 pb-3"
      onSubmit={(e) => {
        e.preventDefault();
        apply({});
      }}
    >
      <Input
        value={draftQ}
        onChange={(e) => setDraftQ(e.target.value)}
        placeholder="Buscar por empresa…"
        className="w-56"
      />
      <Select value={draftStatus || "all"} onValueChange={(v) => setDraftStatus(v === "all" ? "" : v)}>
        <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          {Object.entries(APPLICATION_STATUS_STYLES).map(([value, style]) => (
            <SelectItem key={value} value={value}>{style.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        <Search className="size-4" />
        Filtrar
      </Button>
    </form>
  );
}
```

> `<SelectItem value="">` é proibido pelo Radix (string vazia é reservada para "sem valor"). Use uma
> sentinela como `"all"` e converta na borda, como acima.

O `TablePager` desenha a linha de status da listagem —
`74 registros · página 1/4   [n]ext  [p]rev` — e liga as teclas `n`/`p` no
`document` (A13). Duas consequências para quem monta uma tela nova:

- **o pager só funciona dentro de um Client Component.** Ele recebe
  `onPageChange` e registra um listener; importá-lo de um Server Component é
  erro de compilação. O resto do módulo (`TableLoadingRow`, `TableEmptyRow`,
  `ListingIndex*`) é marcação pura e continua no servidor — por isso
  `table-pager.tsx` **não** tem `"use client"` no topo.
- **não duplique o pager de cima e o de baixo como componentes diferentes.**
  Duas instâncias montam dois listeners para a mesma tecla; o caso real
  (`position: "top" | "bottom"`) devolve o `TablePager` só numa das duas.

---

## 5. Receita (b) — criar/editar em `Dialog`

Um só componente para os dois casos: sem `initial` é criação, com `initial` é edição.

A implementação de referência **existe no repositório**: `src/app/_actions/contacts.ts`
(`saveContact`) + `src/app/admin/contacts/contact-dialog.tsx` (`ContactDialog`). Os trechos abaixo
são esse par, encurtado. Quando os dois divergirem, o arquivo real ganha — e esta seção é corrigida
junto.

> **Quando NÃO usar Dialog.** Formulário longo mora em rota própria: a candidatura tem ~15 campos e
> vive em `/admin/applications/new` + `/admin/applications/[id]/edit`, com `useActionState` e
> `redirect()` no sucesso (§5.3). Dialog é para entidade curta editada sem sair da lista — contato,
> referência profissional, chave de API, evento do log.

### 5.1 A action

```ts
// src/app/_actions/contacts.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import type { ActionResult } from "./action-result";

/** Espelho do sentinela do `<Select>`: o Radix proíbe `value=""` (§4.2). */
const NONE = "none";

const contactSchema = z.object({
  name: z.string().min(1, "Informe o nome.").max(160),
  roleTitle: z.string().max(160).optional().or(z.literal("")),
  companyId: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A2 — fora de try/catch
}

export async function saveContact(
  id: string | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." }; // A3
  }

  const companyId = trim(formData.get("companyId"));
  const parsed = contactSchema.safeParse({
    name: trim(formData.get("name")),
    roleTitle: trim(formData.get("roleTitle")),
    companyId: companyId === NONE ? "" : companyId, // sentinela → vazio, na borda
    email: trim(formData.get("email")),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Confira os campos destacados.",
      fieldErrors: fieldErrorsOf(parsed.error), // { [nome do campo]: mensagem }
    };
  }

  const data = parsed.data;
  const facts = {
    name: data.name,
    roleTitle: emptyToNull(data.roleTitle),
    companyId: emptyToNull(data.companyId),
    email: emptyToNull(data.email),
  };

  try {
    const row = id
      ? await db.contact.update({ where: { id }, data: facts, select: { id: true } })
      : await db.contact.create({
          data: { ...facts, visibility: "private" },
          select: { id: true },
        });

    revalidatePath("/admin/contacts"); // === invalidateQueries
    return {
      ok: true,
      data: { id: row.id },
      message: id ? "Contato atualizado." : "Contato criado.",
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Violação de `@@unique`: vira erro DE CAMPO, não toast genérico.
      return {
        ok: false,
        message: "Confira os campos destacados.",
        fieldErrors: { name: "Já existe um contato com esse nome nesta empresa." },
      };
    }
    console.error("[admin] save contact failed", safeError(err)); // detalhe fica no servidor
    return { ok: false, message: "Não foi possível salvar o contato." };
  }
}
```

> `trim`, `emptyToNull`, `fieldErrorsOf` e `safeError` são helpers locais do módulo. `safeError`
> existe porque um erro do Prisma carrega os argumentos da consulta — que aqui são o e-mail e o
> telefone de outra pessoa; ele deixa passar só o nome e o código do erro.

### 5.2 O dialog

```tsx
// src/app/admin/contacts/contact-dialog.tsx
"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { saveContact } from "@/app/_actions/contacts";
import { FieldError, RequiredHint, describedBy } from "@/components/admin/field-output";
import { submitKeepingValues } from "@/components/admin/form-submit";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ContactInitial = { id: string; name: string; roleTitle: string | null };

export function ContactDialog({ initial }: { initial?: ContactInitial }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await saveContact(initial?.id ?? null, formData);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message); // (d)
        return;
      }
      setErrors({});
      setOpen(false);                                    // fecha só no sucesso
      toast.success(result.message ?? "Contato salvo."); // (d)
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setErrors({});
      }}
    >
      <DialogTrigger asChild>
        {initial ? (
          // A10: botão só de ícone — o nome vem do `aria-label`, sem colchetes.
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Editar o contato ${initial.name}`}
            title="Editar"
          >
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            [ novo contato ]
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        {/* A15: `onSubmit` + `submitKeepingValues`, NUNCA `action={onSubmit}`.
            O React 19 reseta o formulário ao fim de QUALQUER função de
            `action`, e no caminho de erro isso apagava tudo o que tinha sido
            digitado. Ver §5.3 e `@/components/admin/form-submit`. */}
        <form onSubmit={(event) => submitKeepingValues(event, onSubmit)}>
          <DialogHeader>
            <DialogTitle>{initial ? "Editar contato" : "Novo contato"}</DialogTitle>
            <DialogDescription>
              Dados pessoais de terceiros. Ficam privados: nenhuma rota pública lê esta tabela.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              {/* A9: obrigatoriedade escrita dentro do <Label>, erro com id. */}
              <Label htmlFor="contact-name">
                Nome
                <RequiredHint />
              </Label>
              <Input
                id="contact-name"
                name="name"
                defaultValue={initial?.name ?? ""}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={describedBy(errors.name && "contact-name-error")}
                autoComplete="off"
                required
              />
              <FieldError id="contact-name-error">{errors.name}</FieldError>
            </div>
            {/* … demais campos … */}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              [ cancelar ]
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "[ salvando… ]" : "[ salvar ]"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 5.3 `onSubmit` e não `action=` — o reset invisível do React 19 (A15)

**O que esta seção ensinava errado** — o código deixou de fazer isso na bko-04, o texto só agora.
ERRADO, não copie:

```tsx
{/* ERRADO: action recebe uma função do cliente: React entrega o FormData e
    NÃO reseta o form sozinho (isso só acontece com Server Action direta). */}
<form action={onSubmit}>{/* … */}</form>
```

A afirmação do comentário é falsa: **o React 19 reseta o `<form>` assim que a função de `action`
termina — qualquer função**, Server Action ou não. O comentário ficou aqui, marcado, só para quem
encontrar a cópia dele numa tela antiga saber que já foi medido e corrigido.

**O estrago, medido.** `scripts/smoke-admin-write.mjs`, contato com e-mail inválido: depois do toast
`stderr: E-mail inválido.`, todos os campos não controlados do diálogo voltavam vazios
(`name=""`, `roleTitle=""`, `email=""`, `phone=""`, …). A tela mandava "confira os campos
destacados" sobre campos que ela mesma tinha acabado de apagar; e com o obrigatório zerado o segundo
clique em `[ salvar ]` nem submetia — a validação nativa do navegador barrava, sem toast e sem
explicação.

**A correção.** `onSubmit={(event) => submitKeepingValues(event, onSubmit)}`. O `preventDefault()`
tira o formulário do fluxo de ação do React, e é o reset desse fluxo que estamos evitando. O handler
recebe o mesmo `FormData` que o `action=` entregaria, então o corpo da função de submit não muda.

- **É `(event, handler)`, não uma fábrica `handler => onSubmit`.** A fábrica seria CHAMADA durante a
  renderização, e o lint do React Compiler reprova (`Cannot access refs during render`) qualquer
  função criada assim que possa tocar num `ref` — é o caso de `settings/password-form.tsx`, que
  chama `form.reset()`. Na forma atual a closure é criada, não executada.
- **Não se perde realce progressivo:** uma função DE CLIENTE não roda sem JS, então estes
  formulários já dependiam de JS.
- **Quem fica com `action=`, de propósito:** os dois formulários que passam uma **Server Action
  direta** — `src/components/admin/application-form.tsx` (via `useActionState`) e
  `src/components/admin/login-form.tsx`. Lá o reset é o comportamento documentado do React e o
  `action=` é o que faz o formulário funcionar sem JS; mudar aquilo é mexer no contrato do servidor.
- **Quem QUER limpar depois do sucesso chama `form.reset()`** (a troca de senha, via `useRef`).
  Agora essa chamada é a única que reseta, e não uma redundância ao lado de um reset invisível.
- **O CI trava isso:** `src/components/admin/form-submit.test.tsx` tem o controle negativo
  (`action={fn}` esvazia o formulário) ao lado da prova de que `submitKeepingValues` entrega o mesmo
  `FormData` e não esvazia, mais o caso de ponta a ponta no `ContactDialog`.

Usam `submitKeepingValues` hoje: `contacts/contact-dialog.tsx`, `contacts/reference-dialog.tsx`,
`api-keys/create-key-dialog.tsx`, `settings/password-form.tsx`, `application-detail/key-fields-dialog.tsx`,
`application-detail/log-event-dialog.tsx`, `generator-form.tsx` e `project-form.tsx`.

**Por que `useTransition` e não `useActionState`:** `useActionState` só entrega o estado no próximo
render, então "fechar o dialog + dar toast" exige um `useEffect` observando o estado — que dispara de
novo em re-render e é exatamente o padrão que o `react-hooks/set-state-in-effect` do ESLint sinaliza.
Com `startTransition(async …)` o resultado está na mão, na mesma função. Reserve `useActionState`
para formulário de página inteira, sem dialog e sem toast — é o caso de
`src/components/admin/application-form.tsx`, que redireciona no sucesso.

---

## 6. Receita (c) — deletar com confirmação forte

Confirmação forte = o usuário **digita o nome exato** do registro. Nada de `confirm()` do browser.

A instância concreta que já existe é `src/components/admin/delete-application-button.tsx`
(`DeleteApplicationButton`) — ela importa `deleteApplication` ela mesma e recebe só props
serializáveis (`id`, `company`, `folderName`). A versão genérica abaixo é o molde para a segunda
entidade que precisar disso; até lá, o arquivo `confirm-delete-dialog.tsx` **não existe**.

```tsx
// src/components/admin/confirm-delete-dialog.tsx  (crie no primeiro uso; é genérico)
"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DestructiveEcho } from "@/components/admin/destructive-echo";
import type { ActionResult } from "@/app/_actions/action-result";

export function ConfirmDeleteDialog({
  id,
  name,
  entityLabel,
  command,
  action,
}: {
  id: string;
  /** Texto exato que o usuário precisa digitar. */
  name: string;
  /** "candidatura", "projeto", "chave de API"… */
  entityLabel: string;
  /** O comando que o eco desenha — regra A11. Ilustrativo, nunca executado. */
  command: string;
  /**
   * REFERÊNCIA a uma Server Action (`import { deleteX } from "@/app/_actions/…"`).
   * Uma referência de Server Action é serializável, então este componente pode
   * ser usado direto de um Server Component. Uma arrow function comum NÃO é —
   * ver a nota no fim desta seção.
   */
  action: (id: string) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();
  const matches = typed.trim() === name.trim();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTyped("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${entityLabel}`}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {entityLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é irreversível. Para confirmar, digite <strong>{name}</strong> abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* A11: todo diálogo de exclusão ecoa o comando equivalente. */}
        <DestructiveEcho command={command} />

        <div className="space-y-1.5 py-2">
          <Label htmlFor="confirm-name">Nome do registro</Label>
          <Input
            id="confirm-name"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            placeholder={name}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>[ cancelar ]</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!matches || isPending}
            onClick={(e) => {
              // O AlertDialogAction fecha o dialog no clique; segure para poder
              // mostrar o pendente e o erro sem a UI sumir embaixo.
              e.preventDefault();
              startTransition(async () => {
                const res = await action(id);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                setOpen(false);
                toast.success(res.message ?? `${entityLabel} excluída.`);
              });
            }}
          >
            {/* A10: o rótulo do botão é texto entre colchetes. */}
            {isPending ? "[ excluindo… ]" : "[ excluir definitivamente ]"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Uso, direto de dentro do `rows.map()` do Server Component:

```tsx
import { deleteApplication } from "@/app/_actions/applications";

<ConfirmDeleteDialog
  id={row.id}
  name={row.company}
  entityLabel="candidatura"
  command={`rm -rf applications/${row.folderName}`}
  action={deleteApplication}
/>
```

E a action correspondente **retorna** `ActionResult` (não `void`, senão não há como dar `toast.error`):

```ts
export async function deleteApplication(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!dbConfigured) return { ok: false, message: "Banco indisponível." };
  try {
    const row = await db.application.delete({ where: { id } });
    revalidatePath("/admin/applications");
    return { ok: true, message: `Candidatura "${row.folderName}" excluída.` };
  } catch (err) {
    console.error("[admin] delete application failed", err);
    return { ok: false, message: "Não foi possível excluir a candidatura." };
  }
}
```

> **Por que `action={deleteApplication}` e não `onConfirm={() => deleteApplication(row.id)}`:** um Server
> Component **não pode** passar uma função arbitrária para um Client Component — a arrow function não é
> serializável e o Next lança *"Functions cannot be passed directly to Client Components"*. Uma
> **referência a Server Action** (função exportada de um módulo `"use server"`) **é** serializável: o Next
> manda um id e o cliente chama de volta. Por isso o `id` viaja como prop separada, e o dialog compõe
> `action(id)` já do lado do cliente.

---

## 7. Receita (d) — toasts

```tsx
import { toast } from "sonner";

toast.success("Candidatura criada.");
toast.error("Não foi possível salvar a candidatura.");
toast.warning("Sincronização parcial: 3 arquivos falharam.");
toast.info("Nada mudou desde a última sincronização.");
```

- O `<Toaster />` já está em `src/app/admin/layout.tsx` (A8). Não monte outro, não passe props de
  tema por chamada: posição (canto inferior direito), tema e marcadores `✓`/`✗` vivem em
  `src/components/ui/sonner.tsx`, porque o toast do admin é uma **linha de saída** (bko-04).
- **Toast é só do cliente.** Server Action não dá toast — ela devolve `message` e quem chama decide.
- Sempre em pt-BR, uma frase, com ponto final.
- **Sucesso silencioso é bug:** toda mutação confirmada mostra `toast.success`. Toda falha mostra
  `toast.error` com a `message` da action.
- Não use `toast.promise` aqui: o `isPending` do `useTransition` já cobre o estado de carregamento e
  mantém o botão desabilitado.

---

## 8. Checklist antes de abrir a PR da tela

- [ ] `auth()` + `redirect("/admin/login")` no topo do `page.tsx` (A1) e `requireAdmin()` em toda action (A2).
- [ ] `dbConfigured` checado; a página renderiza sem `DATABASE_URL` (A3). Confirme com
      `env -u DATABASE_URL pnpm build`.
- [ ] Filtro e página na **URL**, paginação no **banco** (`skip`/`take`), nunca `.filter()` no cliente.
- [ ] Os 4 estados da tabela na ordem da §3.
- [ ] Formulário com `onSubmit` + `submitKeepingValues`, nunca `action={fn}` de cliente (A15, §5.3).
- [ ] `revalidatePath` em toda action que escreve.
- [ ] `toast.success` / `toast.error` em toda mutação.
- [ ] Nenhum `<SelectItem value="">`, nenhum `toLocaleDateString`, nenhum primitivo caseiro.
- [ ] Rótulos em pt-BR.
- [ ] Se criou rota nova que já está no `NAV` do `terminal/admin-tree-nav.tsx`, **vire o `ready` para `true`** e tire a entrada do bloco final de `# em breve`.
- [ ] Se a rota é nova de verdade, acrescente-a à tabela de `terminal/admin-route-chrome.ts` (caminho + comando + destino do `cd ..`) e ao teste dela.
- [ ] Listagem sem `<Card>`, cabeçalho em minúsculas, coluna de índice, larguras em `ch` (A12).
- [ ] Atalho novo escrito na tela, e o nome acessível do controle começando pelo rótulo visível (A13).
- [ ] Animação nova legível no último quadro; conferida com `node scripts/a11y-admin-axe.mjs --motion` (A14).
- [ ] Token do vocabulário shadcn só dentro do admin (A7) — `pnpm lint` reprova o resto.
- [ ] Varredura de acessibilidade da rota nova:
      `ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/a11y-admin-axe.mjs --only <rota>`
      e a mesma coisa com `--keyboard`. Zero `critical`/`serious`, zero parada sem foco visível.
- [ ] `pnpm lint` e `env -u DATABASE_URL pnpm build` verdes.

---

## 9. Inventário do que já existe

| Arquivo | O que oferece |
|---|---|
| `src/components/admin/admin-shell.tsx` | `AdminShell({ email, name?, children })` — aplica o chrome de terminal; reexporta `NAV` · `isNavItemActive` · `activeNavHref` |
| `src/components/admin/terminal/admin-route-chrome.ts` | `describeAdminRoute(pathname, name?)` → `{ path, command, back }` (tabela normativa rota → caminho → comando) · `ADMIN_CWD` |
| `src/components/admin/terminal/admin-chrome.tsx` | `AdminChrome` — barra + árvore + breadcrumb + `{children}` + `cd ..` |
| `src/components/admin/terminal/admin-status-bar.tsx` | `AdminStatusBar({ path })` — reusa `terminal.module.css` do site; só o controle `exit` |
| `src/components/admin/terminal/admin-tree-nav.tsx` | `AdminTreeNav({ pathname, email })` · `NAV` · `isNavItemActive` · `activeNavHref` |
| `src/components/admin/page-header.tsx` | `PageHeader({ title, description?, actions?, className? })` — `title` vira `<h1 class="sr-only">`: o título visível é o breadcrumb do chrome |
| `src/components/admin/table-pager.tsx` | `TablePager` (linha de status + teclas `n`/`p`) · `TableLoadingRow` · `TableEmptyRow` · `ListingIndexHead`/`ListingIndexCell`/`LISTING_INDEX_WIDTH` · `isEditableTarget` |
| `src/components/admin/form-submit.ts` | `submitKeepingValues(event, handler)` — submissão que não deixa o React 19 esvaziar o formulário (A15, §5.3) |
| `src/components/admin/field-output.tsx` | `FieldHelp` · `RequiredHint` · `FieldError` (`stderr:`) · `describedBy` (A9) |
| `src/components/admin/destructive-echo.tsx` | `DestructiveEcho({ command })` — o `$ rm -rf …` ilustrativo do diálogo de exclusão (A11) |
| `src/app/admin/admin.css` | os VALORES dos tokens shadcn sob `.admin-root`, com o número de contraste medido ao lado de cada desvio · `.admin-listing` · `.admin-selection` · `.admin-progress` · a régua `──` do título de diálogo · o piso de `:focus-visible` |
| `scripts/a11y-admin-axe.mjs` | varredura das 18 rotas + overlays: axe-core (padrão), `--keyboard`, `--motion`, `--width 390` |
| `scripts/a11y-dialog-accname.mjs` | prova de que a régua `──` do título não vaza para o nome acessível |
| `scripts/check-admin-utilities.ts` | a guarda do `pnpm lint` contra o vazamento do vocabulário shadcn (A7) |
| `src/components/admin/status-badge.tsx` | `makeStatusBadge` · `StatusBadge` · `statusLabelFrom` · `FunnelStageBadge` · `SponsorshipBadge` · `ApplicationSourceBadge` · badges de status/categoria de projeto e visibilidade |
| `src/lib/format.ts` | `formatDate` (data de calendário, UTC) · `formatDateTime` (instante, America/Sao_Paulo) · `formatMoney(value, currency = "BRL")` · `formatNumber` · `formatPercent` · `toDateInputValue` (inverso exato de `new Date("YYYY-MM-DD")`) · `EMPTY` (`"—"`) |
| `src/components/ui/*` | 19 primitivos shadcn (style `radix-lyra`) |
| `src/lib/db.ts` | `db` (PrismaClient) e `dbConfigured` |
| `src/lib/auth.ts` | `auth()` |
| `src/lib/applications.ts` | **(cliente)** `FUNNEL_STAGES` · `FUNNEL_STAGE_LABELS` · `FUNNEL_STAGE_PHASES` · `SENT_STAGES` · `INTERVIEW_STAGES` · `SPONSORSHIP_SIGNALS` · `SPONSORSHIP_LABELS`/`_HINTS`/`_GATES` · `SPONSORSHIP_ROUTES` (as duas rotas) · `APPLICATION_SOURCES` · `SOURCE_LABELS` · `slugPart` · `buildFolderName` |
| `src/lib/applications-query.ts` | **(`server-only`)** `parseApplicationFilters` · `parsePage` · `buildApplicationWhere` · `listApplications` · `listApplicationMarkets` · `listApplicationSources` · `effectiveSponsorship`/`effectiveMarket` · `APPLICATIONS_PAGE_SIZE` |
