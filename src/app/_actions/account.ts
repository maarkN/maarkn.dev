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
import { getAdminLabels } from "@/lib/admin/request";
import { safeDbError } from "@/lib/safe-error";
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

/** The messages are codes; the sentence is the dictionary's, in the language of the screen (A4). */
const schema = z
  .object({
    currentPassword: z.string().min(1, "currentPassword"),
    newPassword: z.string().min(MIN_PASSWORD_LENGTH, "newPassword").max(MAX_PASSWORD_LENGTH, "newPassword"),
    confirmPassword: z.string().min(1, "confirmPassword"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "mismatch" })
  .refine((d) => d.newPassword !== d.currentPassword, { path: ["newPassword"], message: "same" });

export async function changePassword(
  formData: FormData,
): Promise<ActionResult> {
  // A2 — every action starts with the admin guard. `redirect()` throws a Next
  // control-flow exception, so it stays out of any try/catch.
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  const { settings, common } = await getAdminLabels();
  const words = settings.password;
  if (!dbConfigured) return { ok: false, message: common.noDatabase }; // A3

  const parsed = schema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) {
        fieldErrors[key] = words.errors[issue.message as keyof typeof words.errors] ?? words.errors.invalid;
      }
    }
    return { ok: false, message: common.checkFields, fieldErrors };
  }

  const email = session.user.email?.toLowerCase();
  if (!email) {
    return { ok: false, message: words.noEmail };
  }

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return { ok: false, message: words.noUser };
    }

    const currentOk = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash,
    );
    if (!currentOk) {
      return { ok: false, message: words.errors.wrong, fieldErrors: { currentPassword: words.errors.wrong } };
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_COST);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });

    revalidatePath("/admin/settings");
    return { ok: true, message: words.done };
  } catch (err) {
    // Detail stays on the server: the message the UI shows must never leak the
    // hash, the SQL or the user record.
    console.error("[admin] change password failed", safeDbError(err));
    return { ok: false, message: words.failed };
  }
}
