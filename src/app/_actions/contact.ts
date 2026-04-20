"use server";

import { site } from "@/lib/site";

export type ContactState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; errors: Partial<Record<ContactField, string>>; message?: string };

export type ContactField = "name" | "email" | "company" | "type" | "message";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPES = new Set([
  "freelance",
  "full-time",
  "consulting",
  "audit",
  "other",
]);

function trim(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v.trim() : "";
}

export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const honeypot = trim(formData.get("website"));
  if (honeypot) return { status: "success" };

  const name = trim(formData.get("name"));
  const email = trim(formData.get("email"));
  const company = trim(formData.get("company"));
  const type = trim(formData.get("type"));
  const message = trim(formData.get("message"));

  const errors: Partial<Record<ContactField, string>> = {};

  if (name.length < 2 || name.length > 80) errors.name = "required";
  if (!EMAIL_RE.test(email)) errors.email = "invalid";
  if (company.length > 120) errors.company = "too_long";
  if (type && !TYPES.has(type)) errors.type = "invalid";
  if (message.length < 10 || message.length > 4000) errors.message = "required";

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors };
  }

  const payload = { name, email, company, type, message };
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
