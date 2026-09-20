"use client";

/**
 * Registrar um evento na timeline da candidatura — receita (b) do
 * `AGENTS.md` §5, com dois cuidados que o formulário genérico não tem.
 *
 * 1. **`occurredAt` é convertido AQUI, não no servidor.** O `<input
 *    type="datetime-local">` devolve hora LOCAL sem offset ("2026-08-16T14:30").
 *    `new Date(...)` no cliente resolve isso no fuso do navegador — o do
 *    operador — e `toISOString()` produz o instante absoluto. Fazer a mesma
 *    conversão na action usaria o fuso do processo Node (UTC no contêiner) e
 *    empurraria todo evento 3 horas para trás. Campo vazio = "agora", decidido
 *    no servidor.
 * 2. **`stage_change` não está na lista de tipos.** Esse evento é escrito pela
 *    ação de mover o funil, com `fromStage`/`toStage` preenchidos; criado à mão
 *    aqui, nasceria como uma transição sem origem nem destino. Ver
 *    `LOGGABLE_EVENT_TYPES` em `./detail-badges`.
 */

import { useState, useTransition } from "react";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/app/_actions/action-result";
import {
  FieldError,
  FieldHelp,
  describedBy,
} from "@/components/admin/field-output";
import { submitKeepingValues } from "@/components/admin/form-submit";
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
  EVENT_CHANNELS,
  EVENT_DIRECTION_LABELS,
  LOGGABLE_EVENT_TYPES,
  eventChannelLabel,
  eventTypeLabel,
} from "./detail-badges";

export type LogEventAction = (
  id: string,
  formData: FormData,
) => Promise<ActionResult>;

/** Sentinela: `<SelectItem value="">` é proibido pelo Radix. */
const NONE = "none";

export function LogEventDialog({
  id,
  action,
  contacts = [],
  disabled,
}: {
  id: string;
  action: LogEventAction;
  /** Contatos já vinculados à candidatura, para atribuir autoria ao evento. */
  contacts?: { id: string; name: string }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState<string>("note");
  const [direction, setDirection] = useState<string>(NONE);
  const [channel, setChannel] = useState<string>(NONE);
  const [contactId, setContactId] = useState<string>(NONE);

  function reset() {
    setErrors({});
    setType("note");
    setDirection(NONE);
    setChannel(NONE);
    setContactId(NONE);
  }

  function onSubmit(formData: FormData) {
    // Os `<Select>` do Radix não são inputs nativos: o valor vive no estado.
    formData.set("type", type);
    formData.set("direction", direction === NONE ? "" : direction);
    formData.set("channel", channel === NONE ? "" : channel);
    formData.set("contactId", contactId === NONE ? "" : contactId);

    const local = String(formData.get("occurredAtLocal") ?? "").trim();
    formData.delete("occurredAtLocal");
    if (local) {
      const parsed = new Date(local); // hora local do navegador
      if (Number.isNaN(parsed.getTime())) {
        setErrors({ occurredAt: "Data inválida." });
        toast.error("Confira os campos destacados.");
        return;
      }
      formData.set("occurredAt", parsed.toISOString());
    }

    startTransition(async () => {
      const res = await action(id, formData);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.message);
        return;
      }
      reset();
      setOpen(false);
      toast.success(res.message ?? "Evento registrado.");
    });
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
          <CalendarPlus className="size-4" />
          [ registrar evento ]
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        {/* `onSubmit` e não `action=`: o React 19 reseta o formulário ao fim
            de QUALQUER função de `action` — inclusive de cliente — e o erro de
            validação voltava com os campos em branco (ver
            `@/components/admin/form-submit`). */}
        <form onSubmit={(event) => submitKeepingValues(event, onSubmit)}>
          <DialogHeader>
            <DialogTitle>Registrar evento</DialogTitle>
            <DialogDescription>
              Entra na timeline desta candidatura. Para mudar o estágio use o
              seletor do cabeçalho — ele grava o evento de transição sozinho.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-type">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger
                  id="event-type"
                  className="w-full"
                  aria-describedby={describedBy(
                    errors.type && "event-type-error",
                  )}
                >
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {LOGGABLE_EVENT_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {eventTypeLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="event-type-error">{errors.type}</FieldError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-occurred-at">Quando</Label>
              <Input
                id="event-occurred-at"
                name="occurredAtLocal"
                type="datetime-local"
                aria-invalid={Boolean(errors.occurredAt)}
                aria-describedby={describedBy(
                  "event-occurred-at-help",
                  errors.occurredAt && "event-occurred-at-error",
                )}
              />
              <FieldHelp id="event-occurred-at-help">
                Em branco = agora.
              </FieldHelp>
              <FieldError id="event-occurred-at-error">
                {errors.occurredAt}
              </FieldError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-direction">Direção</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger id="event-direction" className="w-full">
                  <SelectValue placeholder="Direção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não se aplica</SelectItem>
                  {Object.entries(EVENT_DIRECTION_LABELS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-channel">Canal</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger id="event-channel" className="w-full">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem canal</SelectItem>
                  {EVENT_CHANNELS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {eventChannelLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {contacts.length > 0 && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="event-contact">Contato</Label>
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger id="event-contact" className="w-full">
                    <SelectValue placeholder="Contato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sem contato</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="event-subject">Assunto</Label>
              <Input
                id="event-subject"
                name="subject"
                maxLength={300}
                placeholder="Ex.: resposta do recrutador sobre disponibilidade"
                aria-invalid={Boolean(errors.subject)}
                aria-describedby={describedBy(
                  errors.subject && "event-subject-error",
                )}
              />
              <FieldError id="event-subject-error">{errors.subject}</FieldError>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="event-body">Conteúdo</Label>
              <Textarea
                id="event-body"
                name="bodyMd"
                rows={5}
                maxLength={20000}
                placeholder="Markdown livre — o texto do e-mail, a nota da ligação…"
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
              {isPending ? "[ registrando… ]" : "[ registrar ]"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
