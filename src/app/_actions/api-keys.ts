"use server";

/**
 * Server Actions de `/admin/api-keys` — criação e revogação das chaves do MCP.
 *
 * Este arquivo é a ÚNICA porta pela qual uma chave nasce, e o único lugar do
 * sistema em que a chave existe em claro. Três regras governam tudo aqui:
 *
 * 1. **A chave em claro é devolvida UMA vez e nunca mais.** `generateApiKey()`
 *    (`src/lib/mcp/auth.ts`) devolve `{ token, keyPrefix, keyHash }`; só o
 *    `keyHash` (HMAC-SHA256 com o pepper do servidor) e o `keyPrefix` (público)
 *    vão para o banco. O `token` viaja no retorno desta action, é exibido no
 *    dialog e morre com o estado do React. Não há nenhuma leitura, nenhuma
 *    action e nenhuma rota que o recupere depois — nem para o próprio admin.
 * 2. **Nada de `console.log` com o token.** Nem em sucesso, nem em erro. Os
 *    `console.error` daqui recebem apenas o `err` do Prisma, jamais o payload.
 *    O único identificador que aparece em log/UI é o `keyPrefix`.
 * 3. **Revogar não apaga.** `revokedAt` marca a linha; a chave continua no
 *    banco porque `McpAuditLog.apiKeyId` aponta para ela e apagar a chave
 *    apagaria a trilha (`onDelete: SetNull`) de quem escreveu o quê. Por isso
 *    não existe `deleteApiKey` — revogação é irreversível e suficiente.
 *
 * Contrato de retorno e guards: `src/app/admin/AGENTS.md` §2 (A2, A3).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getAdminLabels } from "@/lib/admin/request";
import { fill } from "@/lib/admin/text";
import { safeDbError } from "@/lib/safe-error";
import { db, dbConfigured } from "@/lib/db";
import { generateApiKey, isKeyGenerationConfigured } from "@/lib/mcp/auth";
import { MCP_SCOPES } from "@/lib/mcp/scopes";
import type { ActionResult } from "./action-result";

const MAX_NAME_LENGTH = 80;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Expiração por presets, e não por `<input type="date">`, de propósito: uma
 * data digitada chega como `YYYY-MM-DD`, vira meia-noite **UTC** e passa a
 * depender do fuso de quem digitou para significar "amanhã". Um preset em dias
 * é sempre um deslocamento a partir de agora — sem ambiguidade de fuso e sem a
 * possibilidade de nascer uma chave já expirada.
 *
 * NÃO exportado: um módulo `"use server"` só pode exportar funções async. O
 * dialog repete os rótulos — mantenha os dois lados em sincronia.
 */
const EXPIRY_PRESET_DAYS: Record<string, number | null> = {
  never: null,
  "7": 7,
  "30": 30,
  "90": 90,
  "180": 180,
  "365": 365,
};

/** zod's messages are raw: the sentence of each field is the dictionary's (A4). */
const createSchema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  // `MCP_SCOPES` has 10 items; the ceiling only refuses an inflated payload.
  scopes: z.array(z.enum(MCP_SCOPES)).min(1).max(MCP_SCOPES.length),
  expiresIn: z.enum(Object.keys(EXPIRY_PRESET_DAYS) as [string, ...string[]]),
});

/** Dados que a UI recebe depois de criar — inclui a chave em claro, uma vez. */
export type CreatedApiKey = {
  id: string;
  name: string;
  /** A chave em claro. Exibida uma única vez; não é persistida em lugar nenhum. */
  token: string;
  keyPrefix: string;
  scopes: string[];
  /** ISO 8601, ou `null` quando a chave não expira. */
  expiresAt: string | null;
};

/** Guard A2. `redirect()` lança — por isso fica fora de qualquer try/catch. */
async function requireAdmin(): Promise<{ email: string | null }> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return { email: session.user.email?.toLowerCase() ?? null };
}

/**
 * Resolve o `User.id` do admin logado, para carimbar `createdBy`/`revokedBy`.
 * A sessão é JWT e não carrega o id; a falha é tolerada (a coluna é opcional e
 * não tem FK — a chave sobrevive ao usuário).
 */
async function actorId(email: string | null): Promise<string | null> {
  if (!email) return null;
  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/** Agora, isolado do corpo dos componentes (a regra `react-hooks/purity`). */
function now(): number {
  return Date.now();
}

export async function createApiKey(
  formData: FormData,
): Promise<ActionResult<CreatedApiKey>> {
  const { email } = await requireAdmin();
  const { apiKeys, common } = await getAdminLabels();
  const words = apiKeys.create;
  if (!dbConfigured) return { ok: false, message: common.noDatabase }; // A3

  const parsed = createSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    // Um checkbox por escopo: o FormData traz N entradas com o mesmo nome.
    scopes: formData.getAll("scopes").map(String),
    expiresIn: String(formData.get("expiresIn") ?? "never"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      // `scopes.0` e `scopes` compartilham o mesmo campo na UI.
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = words.errors[key as keyof typeof words.errors] ?? words.errors.invalid;
    }
    return { ok: false, message: common.checkFields, fieldErrors };
  }

  if (!isKeyGenerationConfigured()) {
    // Sem pepper a chave nasceria com um hash que o servidor nunca conseguiria
    // reproduzir: falhar aqui, alto e claro, é melhor do que entregar ao
    // usuário uma credencial que sempre dará 401.
    return { ok: false, message: words.noPepper };
  }

  const days = EXPIRY_PRESET_DAYS[parsed.data.expiresIn] ?? null;
  const expiresAt = days === null ? null : new Date(now() + days * DAY_MS);
  const createdBy = await actorId(email);

  try {
    // O token só existe dentro deste escopo. Nada abaixo o loga, o grava ou o
    // resume — apenas o `keyHash` vai para o banco.
    const generated = generateApiKey("live");

    const row = await db.apiKey.create({
      data: {
        name: parsed.data.name,
        keyHash: generated.keyHash,
        keyPrefix: generated.keyPrefix,
        scopes: parsed.data.scopes,
        expiresAt,
        createdBy,
      },
      select: { id: true, name: true, scopes: true, expiresAt: true },
    });

    revalidatePath("/admin/api-keys");
    return {
      ok: true,
      message: words.created,
      data: {
        id: row.id,
        name: row.name,
        token: generated.token,
        keyPrefix: generated.keyPrefix,
        scopes: row.scopes,
        expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      },
    };
  } catch (err) {
    console.error("[admin] create api key failed", safeDbError(err));
    return { ok: false, message: words.failed };
  }
}

/**
 * Revoga uma chave. `confirmName` é o nome digitado pelo operador no
 * AlertDialog: a conferência é refeita **no servidor** porque a do cliente é
 * só ergonomia — quem chama a action pode ser qualquer coisa.
 */
export async function revokeApiKey(
  id: string,
  confirmName: string,
): Promise<ActionResult> {
  const { email } = await requireAdmin();
  const { apiKeys, common } = await getAdminLabels();
  const words = apiKeys.revoke;
  if (!dbConfigured) return { ok: false, message: common.noDatabase }; // A3
  if (!id) return { ok: false, message: words.missing };

  try {
    const key = await db.apiKey.findUnique({
      where: { id },
      select: { id: true, name: true, keyPrefix: true, revokedAt: true },
    });
    if (!key) return { ok: false, message: words.missing };
    if (key.revokedAt) return { ok: false, message: words.already };
    if (confirmName.trim() !== key.name.trim()) return { ok: false, message: words.mismatch };

    await db.apiKey.update({
      where: { id },
      data: { revokedAt: new Date(now()), revokedBy: await actorId(email) },
    });

    revalidatePath("/admin/api-keys");
    // A auditoria mostra o estado da chave junto de cada chamada.
    revalidatePath("/admin/audit");
    return { ok: true, message: fill(words.done, { name: key.name }) };
  } catch (err) {
    console.error("[admin] revoke api key failed", safeDbError(err));
    return { ok: false, message: words.failed };
  }
}
