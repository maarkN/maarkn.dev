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

import { useState, useTransition } from "react";
import { AlertTriangle, Check, Copy, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { createApiKey, type CreatedApiKey } from "@/app/_actions/api-keys";
import {
  FieldError,
  FieldHelp,
  RequiredHint,
  describedBy,
} from "@/components/admin/field-output";
import { submitKeepingValues } from "@/components/admin/form-submit";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  MCP_SCOPES,
  MCP_SCOPE_LABELS,
  MCP_WRITE_SCOPES,
  type McpScope,
} from "@/lib/mcp/scopes";
// `expiresAt` é um instante real (agora + N dias), não uma data de calendário:
// por A5 do AGENTS.md isso é `formatDateTime`, em America/Sao_Paulo.
import { formatDateTime } from "@/lib/format";

/**
 * Rótulos dos presets de expiração. Os valores precisam bater com as chaves de
 * `EXPIRY_PRESET_DAYS` em `src/app/_actions/api-keys.ts` — que não pode
 * exportá-los, porque um módulo `"use server"` só exporta funções async.
 */
const EXPIRY_OPTIONS: { value: string; label: string }[] = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "180", label: "180 dias" },
  { value: "365", label: "1 ano" },
  { value: "never", label: "Sem expiração" },
];

const DEFAULT_EXPIRY = "90";

const READ_SCOPES = MCP_SCOPES.filter((s) => !MCP_WRITE_SCOPES.includes(s));

function isWrite(scope: McpScope): boolean {
  return MCP_WRITE_SCOPES.includes(scope);
}

/** `sync:read` → `scope-sync-read`: o `:` é legal num id, mas atrapalha
 *  qualquer seletor CSS/`querySelector` que venha a mirar esses campos. */
function scopeFieldId(scope: McpScope): string {
  return `scope-${scope.replace(":", "-")}`;
}

export function CreateKeyDialog({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<McpScope[]>([]);
  const [expiresIn, setExpiresIn] = useState(DEFAULT_EXPIRY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Passo 2. Enquanto não for `null`, a chave em claro está na tela. */
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  function reset() {
    setName("");
    setScopes([]);
    setExpiresIn(DEFAULT_EXPIRY);
    setErrors({});
    setCreated(null); // ← o token é descartado aqui e não volta mais.
    setCopied(false);
    setAcknowledged(false);
  }

  function toggleScope(scope: McpScope, checked: boolean) {
    setScopes((prev) =>
      checked ? [...prev, scope] : prev.filter((s) => s !== scope),
    );
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await createApiKey(formData);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.message);
        return;
      }
      setErrors({});
      // Não fecha: o passo 2 é a única chance de copiar a chave.
      setCreated(res.data ?? null);
      toast.success(res.message ?? "Chave criada.");
    });
  }

  async function copyToken() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.token);
      setCopied(true);
      toast.success("Chave copiada para a área de transferência.");
    } catch {
      toast.error(
        "O navegador bloqueou a cópia automática. Selecione o texto e copie manualmente.",
      );
    }
  }

  const writeSelected = scopes.filter(isWrite);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Com a chave na tela, só o botão "Concluir" fecha (e ele exige o
        // aceite). Esc e clique fora já são barrados no DialogContent; este
        // guard cobre o X e qualquer outro caminho.
        if (!next && created && !acknowledged) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Plus className="size-4" />
          [ nova chave ]
        </Button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-lg"
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
              <DialogTitle>Chave criada — copie agora</DialogTitle>
              <DialogDescription>
                Esta é a única vez que a chave aparece. O servidor guarda apenas
                um HMAC dela; nem o painel, nem a API, nem o banco conseguem
                exibi-la de novo. Se perder, revogue e crie outra.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex items-start gap-2 bg-amber-500/10 p-3 text-amber-400">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  Guarde em um gerenciador de segredos. Não commite em
                  repositório — este é público — e não cole em chat, issue ou
                  log.
                </p>
              </div>

              <div className="space-y-1.5">
                {/* `<code>` não é elemento rotulável, então aqui é
                    `aria-labelledby` e não `<Label htmlFor>`. */}
                <p id="new-api-key-label" className="text-xs leading-none">
                  Chave
                </p>
                <div className="flex items-start gap-2">
                  <code
                    aria-labelledby="new-api-key-label"
                    className="min-w-0 flex-1 bg-muted p-2 font-mono text-xs break-all select-all"
                  >
                    {created.token}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyToken}
                  >
                    {copied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    {copied ? "[ copiado ]" : "[ copiar ]"}
                  </Button>
                </div>
              </div>

              <Separator />

              <dl className="grid grid-cols-[6rem_1fr] gap-y-1.5 text-xs">
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="font-medium">{created.name}</dd>
                <dt className="text-muted-foreground">Prefixo</dt>
                <dd className="font-mono">{created.keyPrefix}</dd>
                <dt className="text-muted-foreground">Expira em</dt>
                <dd className="tabular-nums">
                  {created.expiresAt
                    ? formatDateTime(created.expiresAt)
                    : "nunca"}
                </dd>
                <dt className="text-muted-foreground">Escopos</dt>
                <dd className="font-mono">{created.scopes.join(" · ")}</dd>
              </dl>

              <Separator />

              {/* `id` + `htmlFor` (e não <Label> envolvendo o controle): o
                  Checkbox do Radix é um <button>, e a associação explícita é o
                  padrão documentado. */}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="ack-copied"
                  checked={acknowledged}
                  onCheckedChange={(v) => setAcknowledged(v === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="ack-copied"
                  className="items-start font-normal leading-relaxed"
                >
                  Guardei a chave em local seguro. Entendo que ela não será
                  exibida novamente.
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
                [ concluir ]
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={(event) => submitKeepingValues(event, onSubmit)}>
            <DialogHeader>
              <DialogTitle>Nova chave de API</DialogTitle>
              <DialogDescription>
                Credencial do servidor MCP (<code>POST /api/mcp</code>). Os
                escopos são aplicados no servidor, por tool — dê apenas o que a
                chave precisa.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">
                  Nome
                  <RequiredHint />
                </Label>
                <Input
                  id="key-name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="skill do Obsidian — macbook"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={describedBy(
                    "key-name-help",
                    errors.name && "key-name-error",
                  )}
                  required
                />
                <FieldHelp id="key-name-help">
                  É este nome que você vai digitar para revogar a chave depois.
                </FieldHelp>
                <FieldError id="key-name-error">{errors.name}</FieldError>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  {/* Grupo, não campo: o `Label` não tem controle para
                      apontar, então quem amarra o nome à lista é o
                      `aria-labelledby` do `role="group"` logo abaixo. */}
                  <Label id="key-scopes-label">Escopos</Label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setScopes([...READ_SCOPES])}
                    >
                      [ só leitura ]
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setScopes([])}
                    >
                      [ limpar ]
                    </Button>
                  </div>
                </div>
                <FieldHelp id="key-scopes-help">
                  Não há herança: <code>applications:write</code> não concede{" "}
                  <code>applications:read</code>. Marque os dois quando precisar
                  dos dois.
                </FieldHelp>

                <div
                  role="group"
                  aria-labelledby="key-scopes-label"
                  aria-describedby={describedBy(
                    "key-scopes-help",
                    errors.scopes && "key-scopes-error",
                  )}
                  className="max-h-56 space-y-1.5 overflow-y-auto border border-border p-2"
                >
                  {MCP_SCOPES.map((scope) => (
                    <div key={scope} className="flex items-start gap-2 py-1">
                      <Checkbox
                        id={scopeFieldId(scope)}
                        checked={scopes.includes(scope)}
                        onCheckedChange={(v) => toggleScope(scope, v === true)}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor={scopeFieldId(scope)}
                        className="min-w-0 flex-col items-start gap-0 font-normal"
                      >
                        <span
                          className={
                            isWrite(scope)
                              ? "font-mono text-xs text-amber-400"
                              : "font-mono text-xs"
                          }
                        >
                          {scope}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {MCP_SCOPE_LABELS[scope]}
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>

                {/* Radix Checkbox não participa do FormData sem `name`; os
                    hidden inputs abaixo tornam a serialização explícita. */}
                {scopes.map((scope) => (
                  <input key={scope} type="hidden" name="scopes" value={scope} />
                ))}

                <FieldError id="key-scopes-error">{errors.scopes}</FieldError>

                {writeSelected.length > 0 && (
                  <p className="flex items-start gap-2 text-xs text-amber-400">
                    <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      {writeSelected.length} escopo(s) de escrita. Esta chave
                      poderá alterar dados do funil pelo MCP.
                    </span>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="key-expires">Expiração</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger
                    id="key-expires"
                    className="w-full"
                    aria-describedby={describedBy(
                      errors.expiresIn && "key-expires-error",
                    )}
                  >
                    <SelectValue placeholder="Expiração" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="expiresIn" value={expiresIn} />
                <FieldError id="key-expires-error">
                  {errors.expiresIn}
                </FieldError>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                [ cancelar ]
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "[ criando… ]" : "[ criar chave ]"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
