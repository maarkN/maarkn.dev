"use client";

/**
 * Revogação de chave — receita (c) do `AGENTS.md` §6 (confirmação forte por
 * digitação), com duas diferenças em relação ao `ConfirmDeleteDialog` genérico:
 *
 * 1. **Não deleta.** `revokeApiKey` só marca `revokedAt`. A linha continua no
 *    banco porque `McpAuditLog.apiKeyId` aponta para ela — apagar a chave
 *    apagaria a autoria de tudo que ela escreveu.
 * 2. **O nome digitado vai para o servidor.** A action reconfere. A checagem
 *    daqui é ergonomia (habilitar o botão); a que vale é a de lá, porque quem
 *    chama a action pode não ser esta tela.
 *
 * Este componente é importado direto do Server Component da lista: ele recebe
 * `id`/`name` como props e chama a Server Action do lado do cliente — nenhuma
 * função atravessa a fronteira (ver a nota do §6 do AGENTS.md).
 */

import { useState, useTransition } from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { revokeApiKey } from "@/app/_actions/api-keys";
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

export function RevokeKeyDialog({
  id,
  name,
  keyPrefix,
}: {
  id: string;
  /** Texto exato que o operador precisa digitar. */
  name: string;
  /** Prefixo público, mostrado para desambiguar chaves de nome parecido. */
  keyPrefix: string;
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
        <Button variant="ghost" size="sm" aria-label={`Revogar a chave ${name}`}>
          <Ban className="size-4 text-destructive" />
          Revogar
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revogar chave de API</AlertDialogTitle>
          <AlertDialogDescription>
            A chave <span className="font-mono">{keyPrefix}…</span> passa a ser
            recusada com 401 na próxima chamada ao MCP. É irreversível: não há
            como reativá-la, só criar outra. Para confirmar, digite{" "}
            <strong>{name}</strong> abaixo.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor={`revoke-confirm-${id}`}>Nome da chave</Label>
          <Input
            id={`revoke-confirm-${id}`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            placeholder={name}
            aria-invalid={typed.length > 0 && !matches}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matches || isPending}
            onClick={(e) => {
              // O AlertDialogAction fecha no clique; segure para poder mostrar
              // o pendente e o erro sem a UI sumir por baixo.
              e.preventDefault();
              startTransition(async () => {
                const res = await revokeApiKey(id, typed);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                setOpen(false);
                toast.success(res.message ?? "Chave revogada.");
              });
            }}
          >
            {isPending ? "Revogando…" : "Revogar definitivamente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
