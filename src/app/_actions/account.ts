"use server";

/**
 * Account self-service for the single admin user.
 *
 * Why this file exists: `.env.example` has always promised that "after seeding
 * you can rotate the password through the admin UI" — and there was no such UI.
 * The only way to change the admin password was to re-run the seed. That is the
 * bug this closes (F0.8 of the master prompt / §A of the security audit).
 *
 * Rules applied here:
 * - the current password is re-verified with bcrypt on the server (a valid
 *   session is NOT enough to rotate the credential — a stolen JWT must not be
 *   able to lock the owner out);
 * - the new password is at least 12 characters (the seed's own floor is 8; a
 *   rotation is the moment to raise it) and is re-hashed with cost 12, the same
 *   cost `prisma/seed.ts` uses;
 * - nothing about the stored hash ever reaches the client.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import type { ActionResult } from "./action-result";

/** Same cost factor as `prisma/seed.ts` — a rotation must not weaken the hash. */
const BCRYPT_COST = 12;
/**
 * Minimum length of a rotated password. NOT exported: a `"use server"` module
 * may only export async functions. The form repeats the number in its helper
 * text — keep the two in sync.
 */
const MIN_PASSWORD_LENGTH = 12;
/** bcrypt only reads the first 72 bytes; `lib/auth.ts` caps input at 128. */
const MAX_PASSWORD_LENGTH = 128;

const schema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `A nova senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      )
      .max(
        MAX_PASSWORD_LENGTH,
        `A nova senha pode ter no máximo ${MAX_PASSWORD_LENGTH} caracteres.`,
      ),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "A confirmação não confere com a nova senha.",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "A nova senha precisa ser diferente da atual.",
  });

export async function changePassword(
  formData: FormData,
): Promise<ActionResult> {
  // A2 — every action starts with the admin guard. `redirect()` throws a Next
  // control-flow exception, so it stays out of any try/catch.
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  if (!dbConfigured) return { ok: false, message: "Banco indisponível." }; // A3

  const parsed = schema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Confira os campos destacados.", fieldErrors };
  }

  const email = session.user.email?.toLowerCase();
  if (!email) {
    return {
      ok: false,
      message: "Sessão sem e-mail — entre novamente para trocar a senha.",
    };
  }

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return { ok: false, message: "Usuário do painel não encontrado." };
    }

    const currentOk = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash,
    );
    if (!currentOk) {
      return {
        ok: false,
        message: "Senha atual incorreta.",
        fieldErrors: { currentPassword: "Senha atual incorreta." },
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_COST);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });

    revalidatePath("/admin/settings");
    return { ok: true, message: "Senha alterada." };
  } catch (err) {
    // Detail stays on the server: the message the UI shows must never leak the
    // hash, the SQL or the user record.
    console.error("[admin] change password failed", err);
    return { ok: false, message: "Não foi possível alterar a senha." };
  }
}
