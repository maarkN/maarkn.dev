"use client";

/**
 * Strong-confirmation delete for `Project` (AGENTS.md §6): an `AlertDialog`
 * where the operator has to type the exact project name — no `window.confirm`.
 *
 * Props are unchanged (`{ id, name }`) so every existing call site keeps
 * working. `deleteProject` is imported here rather than received as a prop: a
 * Server Component cannot hand an arbitrary function to a Client Component, and
 * this button is only ever used for projects.
 */

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProject } from "@/app/_actions/admin-projects";
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

export function DeleteProjectButton({ id, name }: { id: string; name: string }) {
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
        <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${name}`} title="Excluir">
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é irreversível. Para confirmar, digite <strong>{name}</strong> abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor={`confirm-delete-${id}`}>Nome do projeto</Label>
          <Input
            id={`confirm-delete-${id}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            placeholder={name}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matches || isPending}
            onClick={(e) => {
              // AlertDialogAction closes the dialog on click; hold it open so
              // the pending state and a possible error stay visible.
              e.preventDefault();
              startTransition(async () => {
                const res = await deleteProject(id);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                setOpen(false);
                toast.success(res.message ?? "Projeto excluído.");
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
