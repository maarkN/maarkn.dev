"use client";

/**
 * Criar/editar um contato — um componente para os dois casos: sem `initial` é
 * criação, com `initial` é edição (§5 do `src/app/admin/AGENTS.md`).
 *
 * `useTransition` e não `useActionState`: com a transition o resultado da
 * action está na mão dentro da mesma função, então dá para fechar o dialog e
 * dar o toast sem um `useEffect` observando estado.
 *
 * PII: os campos aqui são e-mail e telefone de outra pessoa. O formulário não
 * tem `autoComplete` de contato nem `type="email"` com sugestão do navegador
 * ligada — `autoComplete="off"` em tudo, para não jogar o dado de um recrutador
 * no cofre de autopreenchimento do navegador do usuário.
 */

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { saveContact } from "@/app/_actions/contacts";
import {
  FieldError,
  FieldHelp,
  RequiredHint,
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
import { useCompanyOptions } from "./company-options";
import { CONTACT_CHANNELS, CONTACT_CHANNEL_LABELS } from "./vocabulary";

/** Espelho do sentinela de `@/app/_actions/contacts` (o Radix proíbe `value=""`). */
const NONE = "none";

export type ContactInitial = {
  id: string;
  name: string;
  roleTitle: string | null;
  companyId: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  timezone: string | null;
  channel: string | null;
  notesMd: string | null;
};

export function ContactDialog({ initial }: { initial?: ContactInitial }) {
  const companies = useCompanyOptions();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await saveContact(initial?.id ?? null, formData);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      setErrors({});
      setOpen(false); // fecha só no sucesso
      toast.success(result.message ?? "Contato salvo.");
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
        {/* `action` recebe uma função do cliente: o React entrega o FormData e
            NÃO reseta o formulário sozinho. */}
        <form action={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {initial ? "Editar contato" : "Novo contato"}
            </DialogTitle>
            <DialogDescription>
              Dados pessoais de terceiros. Ficam privados: nenhuma rota pública
              lê esta tabela.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4 sm:grid-cols-2">
            <Field
              id="contact-name"
              name="name"
              label="Nome"
              defaultValue={initial?.name ?? ""}
              error={errors.name}
              required
            />
            <Field
              id="contact-role"
              name="roleTitle"
              label="Cargo"
              defaultValue={initial?.roleTitle ?? ""}
              error={errors.roleTitle}
              placeholder="Technical Recruiter"
            />

            <div className="space-y-1.5">
              <Label htmlFor="contact-company">Empresa</Label>
              {/* Sem `disabled` quando a lista vem vazia (falha de leitura):
                  um Select desabilitado não envia campo nenhum, e o save
                  interpretaria isso como "tirar a empresa" — apagando o vínculo
                  em silêncio numa edição. */}
              <Select name="companyId" defaultValue={initial?.companyId ?? NONE}>
                <SelectTrigger
                  id="contact-company"
                  className="w-full"
                  aria-describedby={
                    errors.companyId
                      ? "contact-company-error"
                      : "contact-company-help"
                  }
                >
                  <SelectValue placeholder="Sem empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem empresa</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.companyId ? (
                <FieldError id="contact-company-error">
                  {errors.companyId}
                </FieldError>
              ) : (
                <FieldHelp id="contact-company-help">
                  Só empresas que já existem — a lista é compartilhada com vagas
                  e candidaturas.
                </FieldHelp>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-channel">Canal</Label>
              <Select name="channel" defaultValue={initial?.channel ?? NONE}>
                <SelectTrigger id="contact-channel" className="w-full">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não informado</SelectItem>
                  {CONTACT_CHANNELS.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {CONTACT_CHANNEL_LABELS[channel]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Field
              id="contact-email"
              name="email"
              label="E-mail"
              defaultValue={initial?.email ?? ""}
              error={errors.email}
              placeholder="nome@empresa.com"
            />
            <Field
              id="contact-phone"
              name="phone"
              label="Telefone"
              defaultValue={initial?.phone ?? ""}
              error={errors.phone}
              placeholder="+1 416 555 0100"
            />
            <Field
              id="contact-linkedin"
              name="linkedinUrl"
              label="LinkedIn"
              defaultValue={initial?.linkedinUrl ?? ""}
              error={errors.linkedinUrl}
              placeholder="https://www.linkedin.com/in/…"
              className="sm:col-span-2"
            />
            <Field
              id="contact-timezone"
              name="timezone"
              label="Fuso horário"
              defaultValue={initial?.timezone ?? ""}
              error={errors.timezone}
              placeholder="America/Toronto"
            />

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="contact-notes">Notas</Label>
              <Textarea
                id="contact-notes"
                name="notesMd"
                rows={4}
                defaultValue={initial?.notesMd ?? ""}
                placeholder="Contexto da conversa, preferências, o que ficou combinado…"
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

function Field({
  id,
  name,
  label,
  defaultValue,
  error,
  placeholder,
  required,
  className,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>
        {label}
        {required && <RequiredHint />}
      </Label>
      <Input
        id={id}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        // PII de terceiro: fora do autopreenchimento do navegador.
        autoComplete="off"
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(error && `${id}-error`)}
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
