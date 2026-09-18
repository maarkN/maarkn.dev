"use client";

/**
 * Exclusão com confirmação forte (§6 do `src/app/admin/AGENTS.md`): o usuário
 * digita o nome exato. Nada de `window.confirm`.
 *
 * Serve às duas tabelas da tela porque recebe a Server Action por prop. Isso só
 * é possível porque uma **referência** a Server Action é serializável — o Next
 * manda um id e o cliente chama de volta. Uma arrow function comum
 * (`onConfirm={() => deleteContact(row.id)}`) NÃO é, e o Next lançaria
 * "Functions cannot be passed directly to Client Components"; por isso o `id`
 * viaja como prop separada e a composição acontece aqui.
 */

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionResult } from "@/app/_actions/action-result";
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

export function DeletePersonButton({
  id,
  name,
  entityLabel,
  description,
  action,
}: {
  id: string;
  /** Texto exato que o usuário precisa digitar. */
  name: string;
  /** "contato" | "referência" — entra no título e no rótulo acessível. */
  entityLabel: string;
  /** Uma frase sobre o que sobrevive à exclusão. */
  description: string;
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
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Excluir ${entityLabel} ${name}`}
          title="Excluir"
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {entityLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é irreversível. {description} Para confirmar, digite{" "}
            <strong>{name}</strong> abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor={`confirm-delete-${id}`}>Nome</Label>
          <Input
            id={`confirm-delete-${id}`}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            placeholder={name}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matches || isPending}
            onClick={(event) => {
              // O AlertDialogAction fecha o dialog no clique; segure para
              // mostrar o estado pendente sem a UI sumir embaixo.
              event.preventDefault();
              startTransition(async () => {
                const result = await action(id);
                if (!result.ok) {
                  toast.error(result.message);
                  return;
                }
                setOpen(false);
                toast.success(result.message ?? `${entityLabel} excluída.`);
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
