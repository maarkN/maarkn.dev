"use client";

/**
 * Mover o estágio do funil, a partir do cabeçalho do dossiê.
 *
 * ── Draft → applied, e não "salva ao selecionar" ───────────────────────────
 * O `<Select>` só muda o estado local; a escrita depende do botão "Mover", que
 * aparece quando o rascunho difere do estágio atual. Isso não é preferência de
 * estilo: cada movimento grava um `ApplicationEvent` permanente na timeline, e
 * um `onValueChange` que escreve direto transformaria um clique errado (ou uma
 * navegação de teclado pelo Select) num registro histórico falso que ninguém
 * consegue apagar pela UI.
 *
 * `useTransition` em vez de `useActionState` pela razão do §5.2 do
 * `AGENTS.md`: aqui o resultado precisa estar na mão para dar o toast na mesma
 * função — `useActionState` só entrega no render seguinte e exigiria um
 * `useEffect` observando estado.
 *
 * A Server Action chega por PROP, não por import. O consumidor é o Server
 * Component da página, que importa `moveApplicationStage` de `./actions` e
 * passa a referência — que é serializável (§6 do `AGENTS.md`). Assim este
 * componente não precisa conhecer o caminho do módulo de ações da rota.
 */

import { useState, useTransition } from "react";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import type { FunnelStage } from "@prisma/client";
import type { ActionResult } from "@/app/_actions/action-result";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FUNNEL_STAGE_LABELS, FUNNEL_STAGE_PHASES } from "@/lib/applications";

export type MoveStageAction = (
  id: string,
  stage: string,
) => Promise<ActionResult>;

export function StageSelect({
  id,
  stage,
  action,
  disabled,
}: {
  id: string;
  stage: FunnelStage;
  action: MoveStageAction;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<string>(stage);
  const [isPending, startTransition] = useTransition();
  const dirty = draft !== stage;

  function move() {
    startTransition(async () => {
      const res = await action(id, draft);
      if (!res.ok) {
        // Volta o rascunho para o valor real: manter o botão "Mover" aceso
        // sobre um estágio recusado convida a repetir o mesmo erro.
        setDraft(stage);
        toast.error(res.message);
        return;
      }
      toast.success(res.message ?? "Estágio atualizado.");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={draft}
        onValueChange={setDraft}
        disabled={disabled || isPending}
      >
        <SelectTrigger className="w-56" aria-label="Estágio do funil">
          <SelectValue placeholder="Estágio" />
        </SelectTrigger>
        <SelectContent>
          {FUNNEL_STAGE_PHASES.map((phase) => (
            <SelectGroup key={phase.key}>
              <SelectLabel>{phase.label}</SelectLabel>
              {phase.stages.map((value) => (
                <SelectItem key={value} value={value}>
                  {FUNNEL_STAGE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {dirty && (
        <Button type="button" size="sm" onClick={move} disabled={isPending}>
          <ArrowRightLeft className="size-4" />
          {isPending ? "Movendo…" : "Mover"}
        </Button>
      )}
    </div>
  );
}
