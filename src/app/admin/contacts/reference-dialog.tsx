"use client";

/**
 * Criar/editar uma referência profissional — mesma receita do
 * `contact-dialog.tsx` (§5 do `src/app/admin/AGENTS.md`).
 *
 * Duas diferenças que valem comentário:
 *
 * - **`slug` é chave natural**, não enfeite. Em branco, a action deriva do nome
 *   com a mesma regra de slug do resto do sistema — o campo existe para o dia
 *   em que uma tool de MCP escrever aqui e precisar reencontrar a linha.
 * - **`canContact` é um gate, não uma preferência.** Uma referência que ainda
 *   não autorizou contato não pode ser passada para um recrutador; por isso o
 *   checkbox tem texto explicando, e a lista ordena por ele.
 */

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { saveProfessionalReference } from "@/app/_actions/contacts";
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
import { Textarea } from "@/components/ui/textarea";
import { REFERENCE_LANGUAGES, REFERENCE_LANGUAGE_LABELS } from "./vocabulary";

/** Espelho do sentinela de `@/app/_actions/contacts`. */
const NONE = "none";

export type ReferenceInitial = {
  id: string;
  slug: string;
  name: string;
  relationship: string | null;
  companyName: string | null;
  roleTitle: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  language: string | null;
  canContact: boolean;
  noteMd: string | null;
};

export function ReferenceDialog({ initial }: { initial?: ReferenceInitial }) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await saveProfessionalReference(
        initial?.id ?? null,
        formData,
      );
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.message);
        return;
      }
      setErrors({});
      setOpen(false); // fecha só no sucesso
      toast.success(result.message ?? "Referência salva.");
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
            aria-label={`Editar a referência ${initial.name}`}
            title="Editar"
          >
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            [ nova referência ]
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={(event) => submitKeepingValues(event, onSubmit)}>
          <DialogHeader>
            <DialogTitle>
              {initial ? "Editar referência" : "Nova referência"}
            </DialogTitle>
            <DialogDescription>
              Dados pessoais de terceiros. Ficam privados: nenhuma rota pública
              lê esta tabela.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4 sm:grid-cols-2">
            <Field
              id="reference-name"
              name="name"
              label="Nome"
              defaultValue={initial?.name ?? ""}
              error={errors.name}
              required
            />
            <Field
              id="reference-slug"
              name="slug"
              label="Chave natural"
              defaultValue={initial?.slug ?? ""}
              error={errors.slug}
              placeholder="derivada do nome"
              mono
            />
            <Field
              id="reference-relationship"
              name="relationship"
              label="Relação"
              defaultValue={initial?.relationship ?? ""}
              error={errors.relationship}
              placeholder="Gestor direto, par, cliente…"
            />
            <Field
              id="reference-company"
              name="companyName"
              label="Empresa"
              defaultValue={initial?.companyName ?? ""}
              error={errors.companyName}
            />
            <Field
              id="reference-role"
              name="roleTitle"
              label="Cargo"
              defaultValue={initial?.roleTitle ?? ""}
              error={errors.roleTitle}
            />

            <div className="space-y-1.5">
              <Label htmlFor="reference-language">Idioma</Label>
              <Select name="language" defaultValue={initial?.language ?? NONE}>
                <SelectTrigger id="reference-language" className="w-full">
                  <SelectValue placeholder="Idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Não informado</SelectItem>
                  {REFERENCE_LANGUAGES.map((language) => (
                    <SelectItem key={language} value={language}>
                      {REFERENCE_LANGUAGE_LABELS[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Field
              id="reference-email"
              name="email"
              label="E-mail"
              defaultValue={initial?.email ?? ""}
              error={errors.email}
            />
            <Field
              id="reference-phone"
              name="phone"
              label="Telefone"
              defaultValue={initial?.phone ?? ""}
              error={errors.phone}
            />
            <Field
              id="reference-linkedin"
              name="linkedinUrl"
              label="LinkedIn"
              defaultValue={initial?.linkedinUrl ?? ""}
              error={errors.linkedinUrl}
              placeholder="https://www.linkedin.com/in/…"
              className="sm:col-span-2"
            />

            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="reference-can-contact"
                  name="canContact"
                  defaultChecked={initial?.canContact ?? false}
                  className="mt-0.5"
                  aria-describedby="reference-can-contact-help"
                />
                <Label
                  htmlFor="reference-can-contact"
                  className="text-sm font-normal leading-snug"
                >
                  Autorizou ser contatada
                </Label>
              </div>
              <FieldHelp id="reference-can-contact-help">
                Sem isso marcado, o nome não pode ser passado para um
                recrutador.
              </FieldHelp>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="reference-note">Notas</Label>
              <Textarea
                id="reference-note"
                name="noteMd"
                rows={4}
                defaultValue={initial?.noteMd ?? ""}
                placeholder="Período em que trabalharam juntos, o que essa pessoa consegue atestar…"
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
  mono,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  mono?: boolean;
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
        className={mono ? "font-mono text-xs" : undefined}
        // PII de terceiro: fora do autopreenchimento do navegador.
        autoComplete="off"
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(error && `${id}-error`)}
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}
