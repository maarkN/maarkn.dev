"use client";

/**
 * Formulário de página inteira da candidatura (criar e editar), sobre o modelo
 * normalizado `Application` + `Job` + `Company`.
 *
 * Usa `useActionState` — e não `useTransition` — de propósito: as actions
 * `createApplication`/`updateApplication` fazem `redirect()` no sucesso, então
 * não há retorno para o cliente consumir nem toast a exibir (§2 e §5.2 do
 * `src/app/admin/AGENTS.md`). O feedback de sucesso é a própria navegação; o de
 * erro é o bloco inline no rodapé.
 *
 * Duas coisas que este formulário faz e o antigo não fazia:
 *
 * 1. **Mostra a chave natural.** `folderName` é o que impede o MCP de duplicar
 *    a candidatura na próxima sincronização do vault. Deixá-la implícita seria
 *    convidar a divergência entre a pasta do Obsidian e a linha do banco — por
 *    isso ela aparece, é editável e vem pré-preenchida pela mesma regra da
 *    migration (`empresa--cargo`).
 * 2. **Trata patrocínio como sinal, não como caixinha.** O `sponsorsVisa
 *    Boolean` do tracker antigo colapsava duas rotas diferentes num eixo só.
 *    Aqui o campo tem os 8 sinais reais e um valor extra, "herdar da vaga",
 *    que é o default: repetir na candidatura o que já está na vaga é como as
 *    duas fontes divergem.
 */

import Link from "next/link";
import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import {
  createApplication,
  updateApplication,
  type AppActionState,
} from "@/app/_actions/applications";
import {
  FieldError,
  FieldHelp,
  RequiredHint,
  describedBy,
} from "@/components/admin/field-output";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  APPLICATION_SOURCES,
  FUNNEL_STAGE_LABELS,
  FUNNEL_STAGE_PHASES,
  SOURCE_LABELS,
  SPONSORSHIP_HINTS,
  SPONSORSHIP_LABELS,
  SPONSORSHIP_SIGNALS,
  buildFolderName,
} from "@/lib/applications";

/** Espelho da sentinela de `src/app/_actions/applications.ts`. */
export const INHERIT_SPONSORSHIP = "inherit";

export type ApplicationInput = {
  id?: string;
  folderName?: string;
  company?: string;
  roleTitle?: string | null;
  market?: string | null;
  locationText?: string | null;
  stage?: string;
  sponsorship?: string | null;
  source?: string | null;
  fit?: string | null;
  priority?: number | null;
  careersUrl?: string | null;
  jobUrl?: string | null;
  targetSalary?: string | null;
  /** Já no formato `YYYY-MM-DD` (use `toDateInputValue` na página). */
  appliedAt?: string | null;
  followUp?: string | null;
  notesMd?: string | null;
};

const initialState: AppActionState = { status: "idle" };

/**
 * O zod devolve mensagem crua (em inglês). A UI do backoffice é pt-BR (A4),
 * então o texto exibido vem daqui, indexado pelo campo — exceto quando a action
 * já mandou uma frase pronta (colisão de chave natural).
 */
const FIELD_ERRORS: Record<string, string> = {
  company: "Informe a empresa (até 160 caracteres).",
  roleTitle: "Cargo muito longo (até 160 caracteres).",
  folderName:
    "Use só minúsculas, números e hífen — o separador de empresa e cargo é “--”.",
  market: "Mercado muito longo (até 60 caracteres).",
  locationText: "Local muito longo (até 120 caracteres).",
  stage: "Selecione um estágio válido.",
  sponsorship: "Selecione um sinal de patrocínio válido.",
  source: "Selecione uma origem válida.",
  fit: "Aderência muito longa (até 60 caracteres).",
  priority: "Prioridade deve ser um número de 1 a 99.",
  careersUrl: "Informe uma URL válida (com https://).",
  jobUrl: "Informe uma URL válida (com https://).",
  targetSalary: "Alvo salarial muito longo (até 200 caracteres).",
  appliedAt: "Data inválida.",
  followUp: "Follow-up muito longo (até 200 caracteres).",
  notesMd: "Notas muito longas (até 20000 caracteres).",
};

/** Colisão de chave natural — a action devolve o código `duplicate`. */
const DUPLICATE_ERRORS: Record<string, string> = {
  folderName:
    "Já existe uma candidatura com esta chave. Ajuste a chave natural (pasta).",
  jobUrl: "Esta URL de vaga já está vinculada a outra vaga.",
};

function errorText(field: string, errors: Record<string, string>) {
  const raw = errors[field];
  if (!raw) return undefined;
  if (raw === "duplicate") {
    return DUPLICATE_ERRORS[field] ?? "Este valor já está em uso.";
  }
  return FIELD_ERRORS[field] ?? "Valor inválido.";
}

export function ApplicationForm({
  application,
}: {
  application?: ApplicationInput;
}) {
  const isEdit = Boolean(application?.id);
  const action = isEdit
    ? updateApplication.bind(null, application!.id!)
    : createApplication;
  const [state, run, pending] = useActionState<AppActionState, FormData>(
    action,
    initialState,
  );
  const errors = state.status === "error" ? state.errors : {};

  // A chave natural é derivada enquanto o usuário não a editar. Depois de
  // tocada (ou vinda do banco), fica congelada: reescrevê-la sozinha
  // quebraria o vínculo com a pasta do vault.
  const [company, setCompany] = useState(application?.company ?? "");
  const [roleTitle, setRoleTitle] = useState(application?.roleTitle ?? "");
  const [market, setMarket] = useState(application?.market ?? "");
  const [folderName, setFolderName] = useState(application?.folderName ?? "");
  const [folderTouched, setFolderTouched] = useState(
    Boolean(application?.folderName),
  );
  const derivedFolder = company
    ? buildFolderName({ company, roleTitle, market })
    : "";
  const folderValue = folderTouched ? folderName : derivedFolder;

  /**
   * Os DEMAIS campos também vivem em estado — e isso não é preferência de
   * estilo, é o que impede perda de dado.
   *
   * O React 19 reseta o formulário quando a função de `action` termina, e
   * `useActionState` não é exceção. Medido por `scripts/smoke-admin-write.mjs`
   * com `priority = 999` (passa pela validação nativa, morre no zod do
   * servidor): o erro voltava e o formulário estava assim —
   * `{"company":"Smoke QA …","location":"","priority":""}`. Só sobrevivia o
   * que já era controlado. A tela pedia "confira os campos destacados" sobre
   * campos que ela mesma tinha acabado de esvaziar.
   *
   * A saída aqui é estado, e não `onSubmit` + `preventDefault` como nos
   * diálogos (`@/components/admin/form-submit`): este formulário passa uma
   * Server Action ao `action=` e funciona sem JavaScript — tirá-lo do fluxo de
   * ação do React custaria esse realce progressivo. Campo controlado é
   * renderizado com `value` no HTML do servidor, então o envio sem JS continua
   * mandando tudo.
   */
  const [text, setText] = useState<Record<string, string>>({
    locationText: application?.locationText ?? "",
    fit: application?.fit ?? "",
    priority: application?.priority != null ? String(application.priority) : "",
    appliedAt: application?.appliedAt ?? "",
    followUp: application?.followUp ?? "",
    targetSalary: application?.targetSalary ?? "",
    jobUrl: application?.jobUrl ?? "",
    careersUrl: application?.careersUrl ?? "",
    notesMd: application?.notesMd ?? "",
  });
  const bind = (name: string) => ({
    value: text[name] ?? "",
    onChange: (value: string) => setText((prev) => ({ ...prev, [name]: value })),
  });

  return (
    <form action={run} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vaga e empresa</CardTitle>
            <CardDescription>Quem contrata e para qual posição.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field
              name="company"
              label="Empresa"
              required
              value={company}
              onChange={setCompany}
              help="Vira (ou reaproveita) uma empresa pela chave normalizada."
              error={errorText("company", errors)}
            />
            <Field
              name="roleTitle"
              label="Vaga / cargo"
              value={roleTitle}
              onChange={setRoleTitle}
              error={errorText("roleTitle", errors)}
            />
            <Field
              name="market"
              label="Mercado"
              value={market}
              onChange={setMarket}
              help="ex.: CA, IE, DE, EU-remoto, BR-B2B"
              error={errorText("market", errors)}
            />
            <Field
              name="locationText"
              label="Local"
              {...bind("locationText")}
              help="ex.: Toronto, ON · Remoto (EU)"
              error={errorText("locationText", errors)}
            />
            <Field
              name="folderName"
              label="Chave natural (pasta)"
              value={folderValue}
              onChange={(value) => {
                setFolderTouched(true);
                setFolderName(value);
              }}
              mono
              help="É o que impede o MCP de duplicar esta candidatura. Use o nome exato da pasta em “04 - Candidaturas”."
              error={errorText("folderName", errors)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funil</CardTitle>
            <CardDescription>
              Em que ponto está e por qual rota ela passa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="stage">Estágio</Label>
              <Select name="stage" defaultValue={application?.stage ?? "radar"}>
                <SelectTrigger
                  id="stage"
                  className="w-full"
                  aria-invalid={Boolean(errors.stage)}
                  aria-describedby={describedBy(
                    errorText("stage", errors) && "stage-error",
                  )}
                >
                  <SelectValue placeholder="Estágio" />
                </SelectTrigger>
                <SelectContent>
                  {FUNNEL_STAGE_PHASES.map((phase) => (
                    <SelectGroup key={phase.key}>
                      <SelectLabel>{phase.label}</SelectLabel>
                      {phase.stages.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {FUNNEL_STAGE_LABELS[stage]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="stage-error">
                {errorText("stage", errors)}
              </FieldError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sponsorship">Patrocínio de visto</Label>
              <Select
                name="sponsorship"
                defaultValue={application?.sponsorship ?? INHERIT_SPONSORSHIP}
              >
                <SelectTrigger
                  id="sponsorship"
                  className="w-full"
                  aria-invalid={Boolean(errors.sponsorship)}
                  aria-describedby="sponsorship-help"
                >
                  <SelectValue placeholder="Patrocínio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={INHERIT_SPONSORSHIP}>
                    Herdar da vaga
                  </SelectItem>
                  {SPONSORSHIP_SIGNALS.map((signal) => (
                    <SelectItem
                      key={signal}
                      value={signal}
                      title={SPONSORSHIP_HINTS[signal]}
                    >
                      {SPONSORSHIP_LABELS[signal]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldHelp id="sponsorship-help">
                “Não se aplica (B2B/contractor)” é a rota remota — o gate de
                visto não vale para ela.
              </FieldHelp>
            </div>

            <SelectField
              name="source"
              label="Origem"
              defaultValue={application?.source ?? "company_site"}
              options={APPLICATION_SOURCES.map((value) => ({
                value,
                label: SOURCE_LABELS[value],
              }))}
              error={errorText("source", errors)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                name="fit"
                label="Aderência"
                {...bind("fit")}
                help="ex.: ⭐, ⭐ Go, Bom"
                error={errorText("fit", errors)}
              />
              <Field
                name="priority"
                label="Prioridade"
                type="number"
                {...bind("priority")}
                help="1 = maior"
                error={errorText("priority", errors)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datas e alvo</CardTitle>
            <CardDescription>
              O que alimenta a métrica de conversão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field
              name="appliedAt"
              label="Enviada em"
              type="date"
              {...bind("appliedAt")}
              error={errorText("appliedAt", errors)}
            />
            <Field
              name="followUp"
              label="Follow-up"
              {...bind("followUp")}
              help="uma data ou uma nota curta"
              error={errorText("followUp", errors)}
            />
            <Field
              name="targetSalary"
              label="Alvo salarial"
              {...bind("targetSalary")}
              error={errorText("targetSalary", errors)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
            <CardDescription>
              A URL da vaga é a chave natural da vaga — sem ela, nenhuma vaga é
              criada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field
              name="jobUrl"
              label="URL da vaga"
              type="url"
              {...bind("jobUrl")}
              error={errorText("jobUrl", errors)}
            />
            <Field
              name="careersUrl"
              label="URL da página de carreiras"
              type="url"
              {...bind("careersUrl")}
              help="Fica na empresa, não na vaga."
              error={errorText("careersUrl", errors)}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Notas</CardTitle>
            <CardDescription>
              Markdown. O que você precisa lembrar antes de falar com eles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="notesMd">Notas</Label>
              <Textarea
                id="notesMd"
                name="notesMd"
                rows={5}
                value={text.notesMd}
                onChange={(event) =>
                  setText((prev) => ({ ...prev, notesMd: event.target.value }))
                }
                aria-invalid={Boolean(errors.notesMd)}
                aria-describedby={describedBy(
                  errorText("notesMd", errors) && "notesMd-error",
                )}
              />
              <FieldError id="notesMd-error">
                {errorText("notesMd", errors)}
              </FieldError>
            </div>
          </CardContent>
        </Card>
      </div>

      {state.status === "error" && (
        <FieldError className="text-sm">
          {state.message === "db_unavailable"
            ? "Banco de dados indisponível — nada foi salvo."
            : state.message === "unexpected"
              ? "Não foi possível salvar a candidatura. Tente novamente."
              : "Confira os campos destacados."}
        </FieldError>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/applications">[ cancelar ]</Link>
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          <Save className="size-4" />
          {pending
            ? "[ salvando… ]"
            : isEdit
              ? "[ salvar alterações ]"
              : "[ criar candidatura ]"}
        </Button>
      </div>
    </form>
  );
}

/* ── Campos: composição dos primitivos shadcn, nada caseiro (A6) ─────────── */

function Field({
  name,
  label,
  required,
  type = "text",
  defaultValue,
  value,
  onChange,
  help,
  error,
  mono,
}: {
  name: string;
  label: string;
  required?: boolean;
  type?: string;
  defaultValue?: string | null;
  /** Todo campo de texto é controlado: ver a nota sobre o reset do React 19
   *  em `ApplicationForm`. */
  value?: string;
  onChange?: (value: string) => void;
  help?: string;
  error?: string;
  mono?: boolean;
}) {
  const controlled =
    value !== undefined && onChange !== undefined
      ? { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value) }
      : { defaultValue: defaultValue ?? "" };
  const helpId = help ? `${name}-help` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required && <RequiredHint />}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(helpId, errorId)}
        className={mono ? "font-mono text-xs" : undefined}
        {...controlled}
      />
      {help && <FieldHelp id={helpId}>{help}</FieldHelp>}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

function SelectField({
  name,
  label,
  defaultValue,
  options,
  error,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Select name={name} defaultValue={defaultValue}>
        <SelectTrigger
          id={name}
          className="w-full"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(error && `${name}-error`)}
        >
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError id={`${name}-error`}>{error}</FieldError>
    </div>
  );
}
