"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminLabels } from "@/lib/admin/request";
import { ADMIN_TIME_ZONE_COOKIE, knownTimeZone } from "@/lib/admin/time-zone";
import { auth } from "@/lib/auth";
import type { ActionResult } from "./action-result";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A2
}

/** Kept for a year, and sent to the backoffice alone. (The language is kept by the browser: locale.ts.) */
export async function setAdminTimeZone(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const labels = (await getAdminLabels()).timeZone;
  const zone = knownTimeZone(String(formData.get("timeZone") ?? "").trim());
  if (!zone) return { ok: false, message: labels.unknown, fieldErrors: { timeZone: labels.unknown } };
  (await cookies()).set(ADMIN_TIME_ZONE_COOKIE, zone, {
    path: "/admin",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
  });
  // The layout too: it has the settings that are sent to the browser.
  revalidatePath("/admin", "layout");
  return { ok: true, message: labels.saved };
}
