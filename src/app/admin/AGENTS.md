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
| A7 | **Cores:** use os tokens shadcn (`bg-card`, `text-muted-foreground`, `border-border`, `bg-sidebar`). O azul da marca é **`text-brand` / `bg-brand`**, *não* `bg-accent` (que no shadcn é o fundo de hover). Nunca reatribua `--muted`, `--accent` ou `--border` no `globals.css`. |
| A8 | **Um só `<Toaster/>`**, já montado em `src/app/admin/layout.tsx`. Não registre outro. |

---

## 1. Mapeamento admin de referência → Next

| admin de referência (TanStack Query) | aqui (Next 16 + Server Actions) |
|---|---|
| `useQuery({ queryKey, queryFn })` | **Server Component `async`** lendo o Prisma direto. Não existe fetch no cliente. |
| `queryKey: ["apps", { page, status }]` | **`searchParams` da URL.** A URL é a query key. Filtro e página são estado de servidor, não `useState`. |
| `isLoading` | `loading.tsx` ou `<Suspense fallback={…}>` → renderiza `TableSkeletonRows`. |
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
    actions={<ApplicationDialog />}
  />
  {/* filtros: draft → applied, SEM debounce */}
  <Card>
    <CardContent>{/* Table + TablePager */}</CardContent>
  </Card>
  {/* dialogs no final do arquivo */}
</div>
```

Convenções de célula: números com `tabular-nums`, IDs com `font-mono text-xs`, ícone dentro de botão sempre
`className="size-4"`.

**Ordem obrigatória dos estados da tabela** (a mesma do admin de referência, traduzida para RSC):

1. carregando → `<TableSkeletonRows rows={6} cols={N} />` (dentro do `fallback` do `Suspense`/`loading.tsx`)
2. erro / `!dbConfigured` → `<TableEmptyRow cols={N} destructive message="…" />`
3. vazio → `<TableEmptyRow cols={N} />`
4. dados → `rows.map(...)`

---

## 4. Receita (a) — listar com paginação **server-side**

Nunca filtre/pagine no cliente. `applications-table.tsx` faz isso hoje e não escala para o radar (~191
vagas). A URL é a fonte da verdade.

### 4.1 A página (Server Component)

```tsx
// src/app/admin/applications/page.tsx
import { redirect } from "next/navigation";
import { deleteApplication } from "@/app/_actions/applications";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { PageHeader } from "@/components/admin/page-header";
import { TableEmptyRow } from "@/components/admin/table-pager";
import { ApplicationStatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { ApplicationDialog } from "./application-dialog";
import { ApplicationsToolbar } from "./applications-toolbar";

export const dynamic = "force-dynamic"; // guard + searchParams: nunca prerenderize

const PAGE_SIZE = 20;
const COLS = 5;

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
        <PageHeader
          title="Candidaturas"
          description={`${total} registro(s) no funil.`}
          actions={<ApplicationDialog />}
        />

        <Card>
          <CardContent>
            {/* filtros + pager vivem no mesmo client component: ambos escrevem na URL */}
            <ApplicationsToolbar
              status={status}
              q={q}
              page={page}
              totalPages={totalPages}
              total={total}
              position="top"
            />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Vaga</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aplicado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
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
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.company}</TableCell>
                      <TableCell className="text-muted-foreground">{r.role ?? "—"}</TableCell>
                      <TableCell><ApplicationStatusBadge status={r.status} /></TableCell>
                      <TableCell className="tabular-nums">{formatDate(r.appliedAt)}</TableCell>
                      <TableCell className="text-right">
                        <ConfirmDeleteDialog
                          id={r.id}
                          name={r.company}
                          entityLabel="candidatura"
                          action={deleteApplication}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <ApplicationsToolbar
              status={status}
              q={q}
              page={page}
              totalPages={totalPages}
              total={total}
              position="bottom"
            />
          </CardContent>
        </Card>
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

---

## 5. Receita (b) — criar/editar em `Dialog`

Um só componente para os dois casos: sem `initial` é criação, com `initial` é edição.

### 5.1 A action

```ts
// src/app/_actions/applications.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { APPLICATION_SOURCES, FUNNEL_STAGES } from "@/lib/applications";
import type { ActionResult } from "./action-result";

const schema = z.object({
  company: z.string().min(1, "Informe a empresa.").max(160),
  role: z.string().max(160).optional(),
  stage: z.enum(FUNNEL_STAGES),
  source: z.enum(APPLICATION_SOURCES),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A2 — fora de try/catch
}

export async function saveApplication(
  id: string | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  if (!dbConfigured) return { ok: false, message: "Banco indisponível." }; // A3

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Confira os campos destacados.", fieldErrors };
  }

  try {
    const row = id
      ? await db.application.update({ where: { id }, data: parsed.data })
      : await db.application.create({ data: parsed.data });

    revalidatePath("/admin/applications"); // === invalidateQueries
    return { ok: true, data: { id: row.id }, message: id ? "Candidatura atualizada." : "Candidatura criada." };
  } catch (err) {
    console.error("[admin] save application failed", err); // detalhe fica no servidor
    return { ok: false, message: "Não foi possível salvar a candidatura." };
  }
}
```

### 5.2 O dialog

```tsx
// src/app/admin/applications/application-dialog.tsx
"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { saveApplication } from "@/app/_actions/applications";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Initial = { id: string; company: string; role: string | null };

export function ApplicationDialog({ initial }: { initial?: Initial }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await saveApplication(initial?.id ?? null, formData);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.message); // (d)
        return;
      }
      setErrors({});
      setOpen(false);                                   // fecha só no sucesso
      toast.success(res.message ?? "Salvo.");           // (d)
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
        <Button size="sm">
          {initial ? "Editar" : <><Plus className="size-4" />Nova candidatura</>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        {/* action recebe uma função do cliente: React entrega o FormData e
            NÃO reseta o form sozinho (isso só acontece com Server Action direta). */}
        <form action={onSubmit}>
          <DialogHeader>
            <DialogTitle>{initial ? "Editar candidatura" : "Nova candidatura"}</DialogTitle>
            <DialogDescription>
              Os dados canônicos vêm do MCP. Edite aqui apenas o que for decisão sua.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                name="company"
                defaultValue={initial?.company ?? ""}
                aria-invalid={Boolean(errors.company)}
                required
              />
              {errors.company && (
                <p className="text-xs text-destructive">{errors.company}</p>
              )}
            </div>
            {/* … demais campos … */}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Por que `useTransition` e não `useActionState`:** `useActionState` só entrega o estado no próximo render,
então "fechar o dialog + dar toast" exige um `useEffect` observando o estado — que dispara de novo em
re-render e é exatamente o padrão que o `react-hooks/set-state-in-effect` do ESLint sinaliza. Com
`startTransition(async …)` o resultado está na mão, na mesma função. Reserve `useActionState` para
formulários de página inteira, sem dialog e sem toast (é o que o `project-form.tsx` legado usa).

---

## 6. Receita (c) — deletar com confirmação forte

Confirmação forte = o usuário **digita o nome exato** do registro. Nada de `confirm()` do browser.

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
import type { ActionResult } from "@/app/_actions/action-result";

export function ConfirmDeleteDialog({
  id,
  name,
  entityLabel,
  action,
}: {
  id: string;
  /** Texto exato que o usuário precisa digitar. */
  name: string;
  /** "candidatura", "projeto", "chave de API"… */
  entityLabel: string;
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
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
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
            {isPending ? "Excluindo…" : "Excluir definitivamente"}
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

- O `<Toaster richColors position="top-right" theme="dark" />` já está em `src/app/admin/layout.tsx`
  (A8). Não monte outro, não passe props de tema por chamada.
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
- [ ] `revalidatePath` em toda action que escreve.
- [ ] `toast.success` / `toast.error` em toda mutação.
- [ ] Nenhum `<SelectItem value="">`, nenhum `toLocaleDateString`, nenhum primitivo caseiro.
- [ ] Rótulos em pt-BR.
- [ ] Se criou rota nova que já está no `NAV` do `terminal/admin-tree-nav.tsx`, **vire o `ready` para `true`** e tire a entrada do bloco final de `# em breve`.
- [ ] Se a rota é nova de verdade, acrescente-a à tabela de `terminal/admin-route-chrome.ts` (caminho + comando + destino do `cd ..`) e ao teste dela.
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
| `src/components/admin/table-pager.tsx` | `TablePager` · `TableSkeletonRows` · `TableEmptyRow` |
| `src/components/admin/status-badge.tsx` | `makeStatusBadge` · `StatusBadge` · `statusLabelFrom` · `FunnelStageBadge` · `SponsorshipBadge` · `ApplicationSourceBadge` · badges de status/categoria de projeto e visibilidade |
| `src/lib/format.ts` | `formatDate` (data de calendário, UTC) · `formatDateTime` (instante, America/Sao_Paulo) · `formatMoney(value, currency = "BRL")` · `formatNumber` · `formatPercent` · `toDateInputValue` (inverso exato de `new Date("YYYY-MM-DD")`) · `EMPTY` (`"—"`) |
| `src/components/ui/*` | 19 primitivos shadcn (style `radix-lyra`) |
| `src/lib/db.ts` | `db` (PrismaClient) e `dbConfigured` |
| `src/lib/auth.ts` | `auth()` |
| `src/lib/applications.ts` | **(cliente)** `FUNNEL_STAGES` · `FUNNEL_STAGE_LABELS` · `FUNNEL_STAGE_PHASES` · `SENT_STAGES` · `INTERVIEW_STAGES` · `SPONSORSHIP_SIGNALS` · `SPONSORSHIP_LABELS`/`_HINTS`/`_GATES` · `SPONSORSHIP_ROUTES` (as duas rotas) · `APPLICATION_SOURCES` · `SOURCE_LABELS` · `slugPart` · `buildFolderName` |
| `src/lib/applications-query.ts` | **(`server-only`)** `parseApplicationFilters` · `parsePage` · `buildApplicationWhere` · `listApplications` · `listApplicationMarkets` · `listApplicationSources` · `effectiveSponsorship`/`effectiveMarket` · `APPLICATIONS_PAGE_SIZE` |
