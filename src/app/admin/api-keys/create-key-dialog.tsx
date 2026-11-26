"use client";

/**
 * Dialog de criação de chave de API — receita (b) do `AGENTS.md` §5, com uma
 * diferença que justifica o arquivo inteiro: **a resposta da action contém um
 * segredo**.
 *
 * O dialog tem dois passos:
 *
 *   1. `form`    — nome, escopos, expiração.
 *   2. `created` — a chave em claro, UMA vez, com botão de copiar.
 *
 * Regras do passo 2, todas deliberadas:
 * - o `token` vive só no estado deste componente. Sair do passo 2 (`reset()`)
 *   o descarta, e não existe caminho de volta: nem a action, nem a página, nem
 *   o banco conseguem produzi-lo de novo;
 * - o dialog **não fecha sozinho** enquanto a chave está na tela — nem por
 *   Esc, nem por clique fora, nem pelo X. Fechar exige marcar "guardei a
 *   chave". Fechar por acidente aqui significa perder a credencial e ter de
 *   criar outra;
 * - a chave é renderizada num `<code>` com `break-all` e `select-all`, para o
 *   caminho manual quando a Clipboard API não está disponível (contexto não
 *   seguro, permissão negada).
 */

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, Copy, Plus, ShieldAlert } from "lucide-react";
import type { ActionResult } from "@/app/_actions/action-result";
import { createApiKey, type CreatedApiKey } from "@/app/_actions/api-keys";
// `expiresAt` is a real instant (now + N days), not a calendar date: by A5 that
// is `formatDateTime`, in the configured time zone.
import { useAdminFormat, useCommonLabels } from "@/components/admin/admin-locale";
import { FieldError, FieldHelp, RequiredHint, describedBy } from "@/components/admin/field-output";
import { submitKeepingValues, useFocusFirstInvalid } from "@/components/admin/form-submit";
import { useNotify } from "@/components/admin/notify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { AdminDictionary } from "@/i18n/config";
import { counted } from "@/lib/admin/text";
import { MCP_SCOPES, MCP_WRITE_SCOPES, type McpScope } from "@/lib/mcp/scopes";

/**
 * The presets of expiry. The values have to match the keys of
 * `EXPIRY_PRESET_DAYS` in `src/app/_actions/api-keys.ts`, which cannot export
 * them: a `"use server"` module exports async functions only.
 */
const EXPIRY_OPTIONS = ["7", "30", "90", "180", "365", "never"] as const;
const DEFAULT_EXPIRY = "90";

const READ_SCOPES = MCP_SCOPES.filter((s) => !MCP_WRITE_SCOPES.includes(s));

function isWrite(scope: McpScope): boolean {
  return MCP_WRITE_SCOPES.includes(scope);
}

/** `sync:read` → `scope-sync-read`: a `:` is legal in an id, but trips any CSS selector. */
function scopeFieldId(scope: McpScope): string {
  return `scope-${scope.replace(":", "-")}`;
}

export type CreateKeyWords = {
  create: AdminDictionary["apiKeys"]["create"];
  vocab: Pick<AdminDictionary["vocab"], "scope" | "expiry">;
  never: string;
  /** "escrita": next to a scope that writes. */
  write: string;
};

export function CreateKeyDialog({ disabled, words }: { disabled?: boolean; words: CreateKeyWords }) {
  const { create: text, vocab } = words;
  const { formatDateTime } = useAdminFormat();
  const common = useCommonLabels();
  const notify = useNotify();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<McpScope[]>([]);
  const [expiresIn, setExpiresIn] = useState<string>(DEFAULT_EXPIRY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useFocusFirstInvalid(form, errors);

  /** Step 2. While not `null`, the key in the clear is on screen. */
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  function reset() {
    setName("");
    setScopes([]);
    setExpiresIn(DEFAULT_EXPIRY);
    setErrors({});
    setCreated(null); // ← the token is dropped here and does not come back.
    setCopied(false);
    setAcknowledged(false);
  }

  function toggleScope(scope: McpScope, checked: boolean) {
    setScopes((prev) => (checked ? [...prev, scope] : prev.filter((s) => s !== scope)));
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await createApiKey(formData).catch(
        (): ActionResult<CreatedApiKey> => ({ ok: false, message: common.failed }),
      );
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        if (res.fieldErrors) notify.error(res.message);
        else notify.error(res.message, { action: { label: common.retry, onClick: () => form.current?.requestSubmit() } });
        return;
      }
      setErrors({});
      // It does not close: step 2 is the only chance to copy the key.
      setCreated(res.data ?? null);
      notify.success(res.message ?? text.created);
    });
  }

  async function copyToken() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.token);
      setCopied(true);
      notify.success(text.copied);
    } catch {
      notify.error(text.copyFailed);
    }
  }

  const writeSelected = scopes.filter(isWrite);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // With the key on screen, only "Concluir" closes (and it asks for the
        // acknowledgement). Esc and a click outside are refused below; this
        // guard covers any other way.
        if (!next && created && !acknowledged) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus aria-hidden="true" />
          {text.trigger}
        </Button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-xl"
        showCloseButton={!created}
        onEscapeKeyDown={(e) => {
          if (created) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (created) e.preventDefault();
        }}
      >
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>{text.shownTitle}</DialogTitle>
              <DialogDescription>{text.shownDescription}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <p className="flex items-start gap-2 text-foreground">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warn" />
                {text.secretWarning}
              </p>

              <div className="space-y-2">
                {/* `<code>` is not labelable, so here it is `aria-labelledby`. */}
                <p id="new-api-key-label" className="text-sm font-medium">
                  {text.token}
                </p>
                <div className="flex flex-wrap items-start gap-2">
                  <code
                    aria-labelledby="new-api-key-label"
                    className="min-w-0 flex-1 bg-muted p-2 font-label text-sm break-all select-all"
                  >
                    {created.token}
                  </code>
                  <Button type="button" variant="outline" onClick={copyToken}>
                    {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                    {text.copy}
                  </Button>
                </div>
              </div>

              <Separator />

              <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
                <dt className="text-muted-foreground">{text.summary.name}</dt>
                <dd className="font-medium">{created.name}</dd>
                <dt className="text-muted-foreground">{text.summary.prefix}</dt>
                <dd className="font-label">{created.keyPrefix}</dd>
                <dt className="text-muted-foreground">{text.summary.expires}</dt>
                <dd className="font-label">{created.expiresAt ? formatDateTime(created.expiresAt) : words.never}</dd>
                <dt className="text-muted-foreground">{text.summary.scopes}</dt>
                <dd className="font-label">{created.scopes.join(" · ")}</dd>
              </dl>

              <Separator />

              <div className="flex items-start gap-3">
                <Checkbox
                  id="ack-copied"
                  checked={acknowledged}
                  onCheckedChange={(v) => setAcknowledged(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="ack-copied" className="font-normal">
                  {text.acknowledge}
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                disabled={!acknowledged}
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                {text.done}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form ref={form} noValidate onSubmit={(event) => submitKeepingValues(event, onSubmit)} className="grid gap-6">
            <DialogHeader>
              <DialogTitle>{text.title}</DialogTitle>
              <DialogDescription>{text.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="key-name">
                  {text.name}
                  <RequiredHint />
                </Label>
                <Input
                  id="key-name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={text.namePlaceholder}
                  autoComplete="off"
                  className="w-full"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={describedBy("key-name-help", errors.name && "key-name-error")}
                  required
                />
                <FieldHelp id="key-name-help">{text.nameHelp}</FieldHelp>
                <FieldError id="key-name-error">{errors.name}</FieldError>
              </div>

              <fieldset
                className="space-y-3"
                aria-describedby={describedBy("key-scopes-help", errors.scopes && "key-scopes-error")}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <legend className="text-sm font-medium">
                    {text.scopes} <RequiredHint />
                  </legend>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setScopes([...READ_SCOPES])}>
                      {text.readOnly}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setScopes([])}>
                      {text.clearScopes}
                    </Button>
                  </div>
                </div>
                <FieldHelp id="key-scopes-help">{text.scopesHelp}</FieldHelp>

                <div className="max-h-64 space-y-1 overflow-y-auto border border-input p-3" tabIndex={-1}>
                  {MCP_SCOPES.map((scope, index) => (
                    <div key={scope} className="flex items-start gap-3 py-1.5">
                      <Checkbox
                        id={scopeFieldId(scope)}
                        checked={scopes.includes(scope)}
                        onCheckedChange={(v) => toggleScope(scope, v === true)}
                        className="mt-1"
                        // The first box carries the error, so the focus lands on the group.
                        aria-invalid={index === 0 && Boolean(errors.scopes) ? true : undefined}
                      />
                      <Label htmlFor={scopeFieldId(scope)} className="min-w-0 flex-col items-start gap-0.5 font-normal">
                        <span className="font-label text-sm">
                          {scope}
                          {isWrite(scope) && <span className="font-text text-muted-foreground"> · {words.write}</span>}
                        </span>
                        <span className="text-sm text-muted-foreground">{vocab.scope[scope]}</span>
                      </Label>
                    </div>
                  ))}
                </div>

                {/* A Radix checkbox is not in the FormData without a `name`: the
                    hidden inputs make the serialisation explicit. */}
                {scopes.map((scope) => (
                  <input key={scope} type="hidden" name="scopes" value={scope} />
                ))}

                <FieldError id="key-scopes-error">{errors.scopes}</FieldError>

                {writeSelected.length > 0 && (
                  <p className="flex items-start gap-2 text-sm text-foreground">
                    <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warn" />
                    {counted(text.writeWarning, writeSelected.length)}
                  </p>
                )}
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="key-expires">{text.expires}</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger
                    id="key-expires"
                    className="w-full"
                    aria-invalid={Boolean(errors.expiresIn)}
                    aria-describedby={describedBy(errors.expiresIn && "key-expires-error")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {vocab.expiry[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="expiresIn" value={expiresIn} />
                <FieldError id="key-expires-error">{errors.expiresIn}</FieldError>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                {common.cancel}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? text.pending : text.submit}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
