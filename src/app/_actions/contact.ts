"use server";

import {
  contactSchema,
  contactSource,
  type ContactField,
  type ContactSource,
} from "@/lib/contact-schema";
import { site } from "@/lib/site";

export type ContactState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; errors: Partial<Record<ContactField, string>>; message?: string };

function trim(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Handles both the contact form and the terminal's `mail` command. The form
 * sends the `website` honeypot (empty for humans); the terminal has no such
 * field and marks itself with `source=terminal` instead, which only changes
 * how the email is labelled — validation is the same for both.
 */
export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const honeypot = trim(formData.get("website"));
  if (honeypot) return { status: "success" };

  const source: ContactSource = contactSource(trim(formData.get("source")));

  const parsed = contactSchema.safeParse({
    name: trim(formData.get("name")),
    email: trim(formData.get("email")),
    company: trim(formData.get("company")),
    type: trim(formData.get("type")),
    message: trim(formData.get("message")),
  });

  if (!parsed.success) {
    const errors: Partial<Record<ContactField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ContactField | undefined;
      if (field && !errors[field]) errors[field] = issue.message;
    }
    return { status: "error", errors };
  }

  const { name, email, company, type, message } = parsed.data;
  const payload = { name, email, company, type, message, source };
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("[contact] dry-run (no RESEND_API_KEY set)", payload);
    return { status: "success" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `maarkn.dev <noreply@maarkn.dev>`,
        to: [site.email],
        reply_to: email,
        subject: `New contact from ${name}${company ? ` · ${company}` : ""}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Company: ${company || "—"}`,
          `Type: ${type || "—"}`,
          `Source: ${source}`,
          "",
          message,
        ].join("\n"),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("[contact] resend failed", res.status, detail);
      return {
        status: "error",
        errors: {},
        message: "send_failed",
      };
    }

    return { status: "success" };
  } catch (err) {
    console.error("[contact] resend threw", err);
    return { status: "error", errors: {}, message: "send_failed" };
  }
}
