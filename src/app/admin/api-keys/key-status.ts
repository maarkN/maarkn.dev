/**
 * Estado de uma `ApiKey` — derivado, não armazenado.
 *
 * O banco guarda apenas `revokedAt` e `expiresAt`; "ativa / revogada /
 * expirada" é a leitura dessas duas colunas contra o relógio. Manter isso num
 * único lugar importa porque a MESMA regra precisa existir em três formas: o
 * rótulo da tabela, o `where` do filtro (SQL) e — o que de fato decide — a
 * checagem de `src/lib/mcp/auth.ts`, que recusa a chave em tempo de request.
 * Se as três divergirem, a UI mente sobre o que o servidor aceita.
 *
 * Precedência: **revogada vence expirada**. Uma chave revogada continua
 * revogada depois da data de expiração, e é essa a informação útil ("alguém a
 * cortou"), não "ela venceu sozinha".
 *
 * O import abaixo é só de tipo, então este módulo continua um objeto puro em
 * runtime e a toolbar cliente pode importá-lo sem arrastar a árvore do badge.
 */

import type { StatusStyles } from "@/components/admin/status-badge";

export const KEY_STATUSES = ["active", "revoked", "expired"] as const;

export type KeyStatus = (typeof KEY_STATUSES)[number];

export const KEY_STATUS_STYLES: StatusStyles = {
  active: {
    label: "Ativa",
    className: "bg-emerald-500/15 text-emerald-300",
  },
  expired: {
    label: "Expirada",
    className: "bg-amber-500/15 text-amber-300",
  },
  revoked: {
    label: "Revogada",
    className: "bg-red-500/15 text-red-300",
  },
};

/** `now` entra por parâmetro para que a página inteira use um único instante. */
export function keyStatusOf(
  key: { revokedAt: Date | null; expiresAt: Date | null },
  now: number,
): KeyStatus {
  if (key.revokedAt) return "revoked";
  if (key.expiresAt && key.expiresAt.getTime() <= now) return "expired";
  return "active";
}

export function isKeyStatus(value: string): value is KeyStatus {
  return (KEY_STATUSES as readonly string[]).includes(value);
}
