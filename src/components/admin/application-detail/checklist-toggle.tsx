"use client";

/**
 * Caixa de marcação de um item do pacote de candidatura.
 *
 * Escreve na hora (não há "salvar checklist"): o item é binário e o custo de um
 * clique errado é outro clique. `useTransition` mantém a caixa desabilitada
 * enquanto a escrita corre, para que dois cliques rápidos não disparem duas
 * escritas concorrentes com o mesmo valor de origem.
 *
 * Não há estado otimista de propósito: o `revalidatePath` da action refaz o
 * payload RSC e o `checked` volta do servidor. Um `useState` espelhando `done`
 * ficaria dessincronizado quando a mesma checklist fosse alterada pelo MCP.
 */

import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/app/_actions/action-result";
import { Checkbox } from "@/components/ui/checkbox";

export type ChecklistToggleAction = (
  itemId: string,
  done: boolean,
) => Promise<ActionResult>;

export function ChecklistToggle({
  itemId,
  done,
  label,
  action,
}: {
  itemId: string;
  done: boolean;
  /** Só para o rótulo acessível — o texto visível fica na célula ao lado. */
  label: string;
  action: ChecklistToggleAction;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Checkbox
      checked={done}
      disabled={isPending}
      aria-label={done ? `Reabrir “${label}”` : `Concluir “${label}”`}
      onCheckedChange={(next) => {
        // O Radix devolve `boolean | "indeterminate"`; aqui nunca é o terceiro.
        const value = next === true;
        startTransition(async () => {
          const res = await action(itemId, value);
          if (!res.ok) {
            toast.error(res.message);
            return;
          }
          toast.success(res.message ?? "Checklist atualizada.");
        });
      }}
    />
  );
}
