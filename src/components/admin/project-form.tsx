"use client";

/**
 * Create/edit form for `Project`, on the shadcn primitives.
 *
 * Two things keep it short: the hand-rolled input/label/select/checkbox
 * components are gone (they are `@/components/ui/*` now, rule A6), and the
 * plain text/textarea fields are declared as data (`FieldSpec[]`) instead of
 * twenty near-identical JSX blocks.
 *
 * It is a full-page form, not a dialog, but it still follows the
 * `useTransition` recipe of `src/app/admin/AGENTS.md` §5 rather than
 * `useActionState`: the action result is in hand inside the same callback, so
 * "toast + navigate" needs no `useEffect` (which would trip
 * `react-hooks/set-state-in-effect`).
 *
 * The data shape is untouched on purpose: `stack`/`features` are still typed
 * one per line and stored as String-JSON by the action, and `year` is still a
 * string. Normalising those columns is F1 work, not a presentation refactor.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveProject } from "@/app/_actions/admin-projects";
import {
  FieldError,
  FieldHelp,
  RequiredHint,
  describedBy,
} from "@/components/admin/field-output";
import {
  PROJECT_CATEGORY_STYLES,
  PROJECT_STATUS_STYLES,
} from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type ProjectInput = {
  id?: string;
  slug?: string;
  name?: string;
  year?: string;
  category?: string;
  status?: string;
  featured?: boolean;
  monogram?: string;
  accentFrom?: string;
  accentTo?: string;
  stack?: string[];
  sourceVisibility?: string;
  repoUrl?: string | null;
  demoUrl?: string | null;
  caseUrl?: string | null;
  tagline?: string | null;
  description?: string | null;
  role?: string | null;
  features?: string[];
  coverImage?: string | null;
};

type Option = { value: string; label: string };

/** A plain text or textarea field. `rows` present ⇒ textarea. */
type FieldSpec = {
  name: keyof ProjectInput & string;
  label: string;
  required?: boolean;
  help?: string;
  rows?: number;
  type?: string;
  maxLength?: number;
  /** Value used when creating a new project. */
  fallback?: string;
};

const IDENTITY_FIELDS: FieldSpec[] = [
  { name: "slug", label: "Slug", required: true, help: "Minúsculas e hifens. Vira a URL em /projects/[slug]." },
  { name: "name", label: "Nome do projeto", required: true },
  { name: "year", label: "Ano", required: true, help: "Texto livre: 2025, 2023–2024…" },
];

const COVER_FIELDS: FieldSpec[] = [
  { name: "monogram", label: "Monograma", required: true, maxLength: 4, help: "1 a 4 letras exibidas na capa estilizada." },
  { name: "accentFrom", label: "Cor inicial", required: true, fallback: "#4f6ef7", help: "Hexadecimal, ex.: #4f6ef7." },
  { name: "accentTo", label: "Cor final", required: true, fallback: "#22d3ee", help: "Hexadecimal, ex.: #22d3ee." },
];

/** `repoUrl` is not here: it only exists while the source is public. */
const LINK_FIELDS: FieldSpec[] = [
  { name: "demoUrl", label: "URL da demo", type: "url" },
  { name: "caseUrl", label: "URL do case externo", type: "url" },
];

const CONTENT_FIELDS: FieldSpec[] = [
  { name: "stack", label: "Stack", required: true, rows: 3, help: "Um item por linha (ou separados por vírgula)." },
  { name: "tagline", label: "Tagline", rows: 2, help: "Um parágrafo curto, usado nos cards." },
  { name: "description", label: "Descrição longa", rows: 6, help: "Linguagem simples. Exibida na página de detalhe." },
  { name: "role", label: "Meu papel", rows: 4 },
  { name: "features", label: "Principais entregas", rows: 5, help: "Um item por linha." },
];

const CATEGORY_OPTIONS: Option[] = Object.entries(PROJECT_CATEGORY_STYLES).map(
  ([value, style]) => ({ value, label: style.label }),
);

const STATUS_OPTIONS: Option[] = Object.entries(PROJECT_STATUS_STYLES).map(
  ([value, style]) => ({ value, label: style.label }),
);

const VISIBILITY_OPTIONS: Option[] = [
  { value: "public", label: "Público · exibe o link do repositório" },
  { value: "private", label: "Privado · sem link de código" },
];

/** `stack`/`features` arrive as arrays and are edited one per line. */
function initialValue(project: ProjectInput | undefined, spec: FieldSpec): string {
  const raw = project?.[spec.name];
  if (Array.isArray(raw)) return raw.join("\n");
  if (typeof raw === "string") return raw;
  return spec.fallback ?? "";
}

export function ProjectForm({ project }: { project?: ProjectInput }) {
  const isEdit = Boolean(project?.id);
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [visibility, setVisibility] = useState(
    project?.sourceVisibility === "private" ? "private" : "public",
  );

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await saveProject(project?.id ?? null, formData);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.message);
        return;
      }
      setErrors({});
      toast.success(res.message ?? "Projeto salvo.");
      router.push("/admin/projects");
    });
  }

  const fields = (specs: FieldSpec[]) =>
    specs.map((spec) => (
      <Field
        key={spec.name}
        spec={spec}
        defaultValue={initialValue(project, spec)}
        error={errors[spec.name]}
      />
    ));

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Section title="Identidade">
          {fields(IDENTITY_FIELDS)}
          <SelectField
            name="category"
            label="Categoria"
            required
            options={CATEGORY_OPTIONS}
            defaultValue={project?.category ?? "web"}
            error={errors.category}
          />
          <SelectField
            name="status"
            label="Status"
            required
            options={STATUS_OPTIONS}
            defaultValue={project?.status ?? "live"}
            error={errors.status}
          />
          <SwitchField
            name="featured"
            label="Destaque na home"
            help="Projetos em destaque aparecem na página inicial."
            defaultChecked={project?.featured ?? false}
          />
        </Section>

        <Section title="Capa">
          {fields(COVER_FIELDS)}
          <CoverImageField initial={project?.coverImage} />
        </Section>

        <Section title="Código-fonte e links" className="md:col-span-2">
          <SelectField
            name="sourceVisibility"
            label="Visibilidade do código"
            required
            options={VISIBILITY_OPTIONS}
            value={visibility}
            onValueChange={setVisibility}
            help='Escolha "Privado" para trabalho de cliente ou build interno: a página de detalhe mostra a tarja "Projeto privado" no lugar do botão do GitHub.'
            error={errors.sourceVisibility}
          />
          {visibility === "public" ? (
            <Field
              spec={{ name: "repoUrl", label: "URL do repositório", type: "url" }}
              defaultValue={project?.repoUrl ?? ""}
              error={errors.repoUrl}
            />
          ) : (
            <input type="hidden" name="repoUrl" value="" />
          )}
          {fields(LINK_FIELDS)}
        </Section>

        <Section title="Stack e conteúdo" className="md:col-span-2">
          {fields(CONTENT_FIELDS)}
        </Section>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/projects">[ cancelar ]</Link>
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {isPending
            ? "[ salvando… ]"
            : isEdit
              ? "[ salvar alterações ]"
              : "[ criar projeto ]"}
        </Button>
      </div>
    </form>
  );
}

/* ── field chrome ─────────────────────────────────────────────────────────── */

function Section({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

/** Label + control + help + error, shared by every field below. */
type ShellProps = {
  name: string;
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
};

/** Os ids que o `aria-describedby` de cada controle aponta. */
function helpId(name: string) {
  return `${name}-help`;
}
function errorId(name: string) {
  return `${name}-error`;
}

/**
 * Os atributos que ligam um controle à ajuda e ao erro que o `Shell` desenha
 * logo abaixo dele.
 *
 * É uma função, e não três linhas repetidas em cada campo, porque o `Shell`
 * emite `#{name}-help` e `#{name}-error` sozinho: quem monta o `Shell` à mão e
 * esquece o vínculo produz uma mensagem órfã — visível, anunciada uma vez pelo
 * `role="alert"` e depois inalcançável para quem volta ao campo. Foi o que
 * aconteceu com o upload de capa.
 */
function shellAria({ name, help, error }: Pick<ShellProps, "name" | "help" | "error">) {
  return {
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy(help && helpId(name), error && errorId(name)),
  };
}

function Shell({ name, label, required, help, error, children }: ShellProps & { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <RequiredHint />}
      </Label>
      {children}
      {help && <FieldHelp id={helpId(name)}>{help}</FieldHelp>}
      <FieldError id={errorId(name)}>{error}</FieldError>
    </div>
  );
}

function Field({ spec, defaultValue, error }: { spec: FieldSpec; defaultValue: string; error?: string }) {
  const shared = {
    id: spec.name,
    name: spec.name,
    defaultValue,
    required: spec.required,
    ...shellAria({ name: spec.name, help: spec.help, error }),
  };
  return (
    <Shell name={spec.name} label={spec.label} required={spec.required} help={spec.help} error={error}>
      {spec.rows ? (
        <Textarea {...shared} rows={spec.rows} className="font-mono" />
      ) : (
        <Input {...shared} type={spec.type ?? "text"} maxLength={spec.maxLength} />
      )}
    </Shell>
  );
}

/**
 * Radix `Select` is not a native control, so the value travels in a hidden
 * input instead of relying on the primitive's own form bubbling. Controlled
 * when `value`/`onValueChange` are passed (the visibility toggle needs that),
 * self-managed otherwise.
 */
function SelectField({
  options,
  defaultValue,
  value,
  onValueChange,
  ...shell
}: ShellProps & {
  options: Option[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value ?? "");
  const current = value ?? internal;

  return (
    <Shell {...shell}>
      <input type="hidden" name={shell.name} value={current} />
      <Select
        value={current}
        onValueChange={(next) => {
          setInternal(next);
          onValueChange?.(next);
        }}
      >
        <SelectTrigger
          id={shell.name}
          className="w-full"
          // `required` nativo não alcança aqui: o gatilho do Radix é um
          // `<button>` e o valor viaja num `<input type="hidden">`, que a
          // validação de formulário do navegador ignora por definição. O
          // `(obrigatório)` do rótulo é o canal visível; este é o programático.
          aria-required={shell.required || undefined}
          {...shellAria(shell)}
        >
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Shell>
  );
}

/** Same trick as `SelectField`: the checked state travels in a hidden input. */
function SwitchField({ name, label, help, defaultChecked }: ShellProps & { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(Boolean(defaultChecked));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input type="hidden" name={name} value={checked ? "on" : "off"} />
        <Switch
          id={name}
          checked={checked}
          onCheckedChange={setChecked}
          {...shellAria({ name, help })}
        />
        <Label htmlFor={name}>{label}</Label>
      </div>
      {help && <FieldHelp id={helpId(name)}>{help}</FieldHelp>}
    </div>
  );
}

/**
 * Uploads through `/api/admin/upload` (8 MB cap, extension allowlist) and keeps
 * the returned public path in a hidden input, exactly like before the refactor.
 */
const COVER_HELP = "Opcional. Substitui a capa estilizada nos cards. Máx. 8 MB.";

function CoverImageField({ initial }: { initial?: string | null }) {
  const [url, setUrl] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** Nome do arquivo escolhido — a "saída" do anexo, no lugar do texto nativo. */
  const [picked, setPicked] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicked(file.name);
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "upload_failed");
      setUrl(json.url);
      toast.success("Imagem enviada.");
    } catch (err) {
      const code = err instanceof Error ? err.message : "upload_failed";
      const message =
        code === "file_too_large"
          ? "Arquivo maior que 8 MB."
          : code === "bad_type"
            ? "Formato de imagem não aceito."
            : "Não foi possível enviar a imagem.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  // O `<input type="file">` desenha, além do botão do sistema, o nome do
  // arquivo (ou "Nenhum arquivo escolhido") em texto do navegador, na língua
  // do navegador. `text-transparent` apaga SÓ esse texto — o botão nativo tem
  // cor própria (`file:text-foreground`) e continua visível, e o valor do
  // campo segue intacto para a API de acessibilidade. A linha de saída abaixo
  // é quem conta o que foi escolhido, na voz do painel.
  return (
    <Shell
      name="coverImageFile"
      label="attach: imagem de capa"
      help={COVER_HELP}
      error={error || undefined}
    >
      <input type="hidden" name="coverImage" value={url} />
      {url && (
        // Uploads are served by a dynamic route; next/image would need a remote
        // pattern for a path that only exists at runtime.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Pré-visualização da capa" className="h-32 w-full border border-border object-cover" />
      )}
      <div className="flex items-center gap-2">
        <Input
          id="coverImageFile"
          type="file"
          accept="image/*"
          onChange={onPick}
          disabled={busy}
          className="flex-1 cursor-pointer text-transparent"
          {...shellAria({
            name: "coverImageFile",
            help: COVER_HELP,
            error: error || undefined,
          })}
        />
        {url && !busy && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remover imagem de capa"
            onClick={() => setUrl("")}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        )}
      </div>
      <p aria-live="polite" className="font-mono text-xs break-all">
        <span aria-hidden="true" className="text-muted-foreground">
          {"attach: "}
        </span>
        {busy ? (
          <span className="text-muted-foreground">
            {picked} · enviando…
          </span>
        ) : picked || url ? (
          <span>{picked || url.split("/").pop()}</span>
        ) : (
          <span className="text-muted-foreground">(nenhum arquivo)</span>
        )}
      </p>
    </Shell>
  );
}
