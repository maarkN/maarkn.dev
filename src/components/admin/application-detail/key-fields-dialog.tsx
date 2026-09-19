"use client";

/**
 * "Editar campos-chave" — a edição rápida que se faz com o dossiê aberto.
 *
 * ── O que este dialog NÃO edita, e por quê ─────────────────────────────────
 * Nem `folderName`, nem empresa, nem URL da vaga. Os três são CHAVE NATURAL de
 * dedupe do MCP (`upsert_application` casa por `folderName`, `upsert_job` por
 * `sourceUrl`): alterá-los aqui faria a próxima sincronização do vault criar
 * uma segunda linha para a mesma vaga — exatamente o problema que o cutover do
 * F2a resolveu. Quem mexe nisso é o formulário completo em `.../[id]/edit`,
 * que tem a validação de colisão e o aviso de duplicidade.
 *
 * `stage` também está fora: mover o funil grava um `ApplicationEvent`, então
 * tem ação própria (`StageSelect`). Dois caminhos de escrita para o mesmo campo
 * produziriam transições sem evento e uma timeline em que não se pode confiar.
 *
 * ── Campo em branco APAGA ──────────────────────────────────────────────────
 * Diferente do formulário completo (onde o vínculo com a vaga é preservado
 * quando o campo vem vazio), aqui vazio significa `null`. Este é o único lugar
 * que edita esses campos; sem isso não haveria como remover uma prioridade ou
 * um follow-up que deixou de valer.
 */

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import type { SponsorshipSignal } from "@prisma/client";
import type { ActionResult } from "@/app/_actions/action-result";
import {
  FieldError,
  FieldHelp,
  describedBy,
} from "@/components/admin/field-output";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  APPLICATION_SOURCES,
  SPONSORSHIP_HINTS,
  SPONSORSHIP_LABELS,
  SPONSORSHIP_SIGNALS,
  sourceLabel,
} from "@/lib/applications";

export type UpdateFieldsAction = (
  id: string,
  formData: FormData,
) => Promise<ActionResult>;

/**
 * Sentinelas do Radix (`value=""` é reservado para "sem valor"). Precisam bater
 * com as constantes homônimas de `src/app/admin/applications/[id]/actions.ts`,
 * que não pode exportá-las: módulo `"use server"` só exporta função async.
 */
const INHERIT = "inherit";
const NONE = "none";

export interface KeyFieldsInitial {
  roleTitle: string | null;
  market: string | null;
  source: string | null;
  sponsorship: SponsorshipSignal | null;
  priority: number | null;
  fit: string | null;
  targetSalary: string | null;
  /** Já no formato `YYYY-MM-DD` (`toDateInputValue`), não um `Date`. */
  appliedAt: string;
  followUp: string | null;
  outcomeReason: string | null;
  notesMd: string | null;
}

export function KeyFieldsDialog({
  id,
  action,
  initial,
  /** Sinal herdado da vaga, só para explicar o que "herdar" significa hoje. */
  inheritedSponsorship,
  disabled,
}: {
  id: string;
  action: UpdateFieldsAction;
  initial: KeyFieldsInitial;
  inheritedSponsorship?: SponsorshipSignal | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const [sponsorship, setSponsorship] = useState<string>(
    initial.sponsorship ?? INHERIT,
  );
  const [source, setSource] = useState<string>(initial.source ?? NONE);

  function reset() {
    setErrors({});
    setSponsorship(initial.sponsorship ?? INHERIT);
    setSource(initial.source ?? NONE);
  }

  function onSubmit(formData: FormData) {
    // Os `<Select>` do Radix não são inputs nativos: o valor vive no estado.
    formData.set("sponsorship", sponsorship);
    formData.set("source", source);

    startTransition(async () => {
      const res = await action(id, formData);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.message);
        return;
      }
      setErrors({});
      setOpen(false);
      toast.success(res.message ?? "Candidatura atualizada.");
    });
  }

  // A origem gravada pelo MCP pode estar fora da lista curada; sem incluí-la,
  // o Radix mostraria o placeholder e o "salvar" trocaria o valor sem aviso.
  const sourceOptions: string[] = [...APPLICATION_SOURCES];
  if (initial.source && !sourceOptions.includes(initial.source)) {
    sourceOptions.push(initial.source);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Pencil className="size-4" />
          [ editar campos-chave ]
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form action={onSubmit}>
          <DialogHeader>
            <DialogTitle>Editar campos-chave</DialogTitle>
            <DialogDescription>
              Só o que é decisão sua. Empresa, chave natural e URL da vaga ficam
              no formulário completo — são a chave de dedupe do MCP. Campo em
              branco apaga o valor.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="kf-role">Cargo</Label>
              <Input
                id="kf-role"
                name="roleTitle"
                defaultValue={initial.roleTitle ?? ""}
                maxLength={160}
                aria-invalid={Boolean(errors.roleTitle)}
                aria-describedby={describedBy(
                  errors.roleTitle && "kf-roleTitle-error",
                )}
              />
              <FieldError id="kf-roleTitle-error">{errors.roleTitle}</FieldError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kf-market">Mercado</Label>
              <Input
                id="kf-market"
                name="market"
                defaultValue={initial.market ?? ""}
                maxLength={60}
                placeholder="CA · IE · DE · US-remote…"
                aria-invalid={Boolean(errors.market)}
                aria-describedby={describedBy(
                  errors.market && "kf-market-error",
                )}
              />
              <FieldError id="kf-market-error">{errors.market}</FieldError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kf-source">Origem</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="kf-source" className="w-full">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem origem</SelectItem>
                  {sourceOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {sourceLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="kf-sponsorship">Patrocínio</Label>
              <Select value={sponsorship} onValueChange={setSponsorship}>
                <SelectTrigger
                  id="kf-sponsorship"
                  className="w-full"
                  aria-describedby="kf-sponsorship-help"
                >
                  <SelectValue placeholder="Patrocínio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={INHERIT}>
                    Herdar da vaga
                    {inheritedSponsorship
                      ? ` (${SPONSORSHIP_LABELS[inheritedSponsorship]})`
                      : ""}
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
              <FieldHelp id="kf-sponsorship-help">
                O sinal da candidatura sobrescreve o da vaga. “Herdar” grava
                NULL e volta a seguir a vaga.
              </FieldHelp>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kf-priority">Prioridade</Label>
              <Input
                id="kf-priority"
                name="priority"
                type="number"
                min={1}
                max={99}
                inputMode="numeric"
                className="tabular-nums"
                defaultValue={initial.priority ?? ""}
                placeholder="1 = maior"
                aria-invalid={Boolean(errors.priority)}
                aria-describedby={describedBy(
                  errors.priority && "kf-priority-error",
                )}
              />
              <FieldError id="kf-priority-error">{errors.priority}</FieldError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kf-fit">Aderência</Label>
              <Input
                id="kf-fit"
                name="fit"
                defaultValue={initial.fit ?? ""}
                maxLength={60}
                placeholder="⭐ Go · Bom · Talvez…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kf-applied-at">Enviada em</Label>
              <Input
                id="kf-applied-at"
                name="appliedAt"
                type="date"
                defaultValue={initial.appliedAt}
                aria-invalid={Boolean(errors.appliedAt)}
                aria-describedby={describedBy(
                  errors.appliedAt && "kf-appliedAt-error",
                )}
              />
              <FieldError id="kf-appliedAt-error">{errors.appliedAt}</FieldError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kf-target-salary">Salário-alvo</Label>
              <Input
                id="kf-target-salary"
                name="targetSalary"
                defaultValue={initial.targetSalary ?? ""}
                maxLength={200}
                placeholder="CAD 130k · EUR 75k · R$ 25k/mês…"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="kf-follow-up">Follow-up</Label>
              <Input
                id="kf-follow-up"
                name="followUp"
                defaultValue={initial.followUp ?? ""}
                maxLength={200}
                placeholder="Uma data ou uma nota curta (“cobrar em 2 semanas”)"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="kf-outcome">Motivo do desfecho</Label>
              <Input
                id="kf-outcome"
                name="outcomeReason"
                defaultValue={initial.outcomeReason ?? ""}
                maxLength={300}
                placeholder="Por que fechou assim (recusa, retirada, sem resposta…)"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="kf-notes">Notas</Label>
              <Textarea
                id="kf-notes"
                name="notesMd"
                rows={6}
                maxLength={20000}
                defaultValue={initial.notesMd ?? ""}
              />
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
              {isPending ? "[ salvando… ]" : "[ salvar ]"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
