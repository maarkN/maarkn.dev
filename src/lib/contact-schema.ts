import { z } from "zod";

/*
 * The contact validation, field by field. `submitContact` (the server action)
 * checks the whole payload with `contactSchema`; the terminal's `mail` command
 * checks each answer as it is typed with the matching sub-schema, so both
 * paths accept exactly the same input. A `"use server"` module may only
 * export async functions, which is why the schemas live here and not next to
 * the action.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CONTACT_TYPES = ["freelance", "full-time", "consulting", "audit", "other"] as const;

/** Where the message was written; anything else counts as the form. */
export type ContactSource = "form" | "terminal";

/* Error codes are the ones the contact form translates: required | invalid | too_long. */
export const nameSchema = z.string().trim().min(2, "required").max(80, "required");
export const emailSchema = z.string().trim().regex(EMAIL_RE, "invalid");
export const companySchema = z.string().trim().max(120, "too_long");
export const typeSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || (CONTACT_TYPES as readonly string[]).includes(v), "invalid");
export const messageSchema = z.string().trim().min(10, "required").max(4000, "required");

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  company: companySchema,
  type: typeSchema,
  message: messageSchema,
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactInput;

/** First error code of `value` against `schema`, or `null` when it passes. */
export function fieldError(schema: z.ZodType<string>, value: string): string | null {
  const result = schema.safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? "invalid");
}

export function contactSource(value: unknown): ContactSource {
  return value === "terminal" ? "terminal" : "form";
}
