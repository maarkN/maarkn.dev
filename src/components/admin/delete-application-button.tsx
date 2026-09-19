"use client";

/**
 * Exclusão de candidatura com confirmação forte (§6 do `src/app/admin/AGENTS.md`):
 * o usuário digita o nome exato da empresa. Nada de `window.confirm`.
 *
 * Renderizado direto de dentro do `rows.map()` do Server Component — só recebe
 * props serializáveis (`id`, `company`) e importa a Server Action ele mesmo.
 */

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteApplication } from "@/app/_actions/applications";
import { DestructiveEcho } from "@/components/admin/destructive-echo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteApplicationButton({
  id,
  company,
  folderName,
}: {
  id: string;
  company: string;
  /** Chave natural — mostrada porque duas candidaturas podem ter o mesmo nome
   * de empresa (mercados diferentes) e a confirmação por nome seria ambígua. */
  folderName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();
  const matches = typed.trim() === company.trim();

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTyped("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Excluir a candidatura de ${company}`}
          title="Excluir"
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir candidatura</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é irreversível. Documentos, eventos e checklist desta
            candidatura vão junto; a empresa e a vaga permanecem.
            {folderName && (
              <>
                {" "}
                Chave: <code className="font-mono text-xs">{folderName}</code>.
              </>
            )}{" "}
            Para confirmar, digite <strong>{company}</strong> abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <DestructiveEcho
          command={`rm -rf applications/${folderName ?? company}`}
        />

        <div className="space-y-1.5 py-2">
          <Label htmlFor={`confirm-delete-${id}`}>Nome da empresa</Label>
          <Input
            id={`confirm-delete-${id}`}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            placeholder={company}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            [ cancelar ]
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!matches || isPending}
            onClick={(event) => {
              // O AlertDialogAction fecha o dialog no clique; segure para
              // mostrar o estado pendente sem a UI sumir embaixo.
              event.preventDefault();
              startTransition(async () => {
                // A action não lança (contrato `ActionResult`, AGENTS.md §2):
                // o único sinal de falha é `ok: false`.
                const res = await deleteApplication(id);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                setOpen(false);
                toast.success(
                  res.message ?? `Candidatura “${company}” excluída.`,
                );
              });
            }}
          >
            {isPending ? "[ excluindo… ]" : "[ excluir definitivamente ]"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
