"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_LOCALE_COOKIE, isAdminLocale } from "@/lib/admin/locale";
import { getAdminLabels } from "@/lib/admin/request";
import { ADMIN_TIME_ZONE_COOKIE, knownTimeZone } from "@/lib/admin/time-zone";
import { auth } from "@/lib/auth";
import type { ActionResult } from "./action-result";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A2
}

/** Kept for a year, and sent to the backoffice alone: the site has its own language. */
async function remember(name: string, value: string) {
  (await cookies()).set(name, value, {
    path: "/admin",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
  });
  // The layout too: the language of the document and the settings sent to the browser.
  revalidatePath("/admin", "layout");
}

export async function setAdminLocale(locale: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isAdminLocale(locale)) {
    return { ok: false, message: (await getAdminLabels()).account.languageFailed };
  }
  await remember(ADMIN_LOCALE_COOKIE, locale);
  return { ok: true };
}

export async function setAdminTimeZone(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const labels = (await getAdminLabels()).timeZone;
  const zone = knownTimeZone(String(formData.get("timeZone") ?? "").trim());
  if (!zone) return { ok: false, message: labels.unknown, fieldErrors: { timeZone: labels.unknown } };
  await remember(ADMIN_TIME_ZONE_COOKIE, zone);
  return { ok: true, message: labels.saved };
}
