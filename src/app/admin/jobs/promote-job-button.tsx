"use client";

/**
 * "Criar candidatura a partir desta vaga".
 *
 * Renderizado direto de dentro do `rows.map()` do Server Component — só recebe
 * props serializáveis e importa a Server Action ele mesmo.
 *
 * Por que o `router.push` mora AQUI e não na action: uma action que chama
 * `redirect()` nunca retorna, e sem retorno não há `toast.success` (§2 do
 * `src/app/admin/AGENTS.md`). A action devolve o id, o cliente mostra o toast e
 * navega — a única forma de ter as duas coisas.
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createApplicationFromJob } from "@/app/_actions/jobs";
import { Button } from "@/components/ui/button";

export function PromoteJobButton({
  jobId,
  jobLabel,
}: {
  jobId: string;
  /** Só para o rótulo acessível: "…a candidatura de Senior Backend @ Acme". */
  jobLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={isPending}
      aria-label={`Criar candidatura a partir de ${jobLabel}`}
      title="Criar candidatura a partir desta vaga"
      onClick={() => {
        startTransition(async () => {
          // A action não lança (contrato `ActionResult`): o único sinal de
          // falha é `ok: false`.
          const result = await createApplicationFromJob(jobId);
          if (!result.ok || !result.data) {
            toast.error(
              result.ok ? "Não foi possível criar a candidatura." : result.message,
            );
            return;
          }
          toast.success(result.message ?? "Candidatura criada.");
          router.push(`/admin/applications/${result.data.id}`);
        });
      }}
    >
      <Sparkles className="size-4" />
    </Button>
  );
}
