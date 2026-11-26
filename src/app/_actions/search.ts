"use server";

import { redirect } from "next/navigation";
import { getAdminLabels } from "@/lib/admin/request";
import type { FoundApplication } from "@/lib/admin/search";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { safeDbError } from "@/lib/safe-error";
import type { ActionResult } from "./action-result";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A2
}

/**
 * Every candidatura, by company and role, for the search window: asked for when
 * it opens, so that none of it is in the HTML of the screens. The matching is in
 * the browser (src/lib/admin/search.ts), which is what finds "São" by "sao".
 */
export async function listSearchableApplications(): Promise<ActionResult<FoundApplication[]>> {
  await requireAdmin();
  const { failed: message } = (await getAdminLabels()).search;
  if (!dbConfigured) return { ok: false, message }; // A3

  try {
    const rows = await db.application.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        folderName: true,
        roleTitle: true,
        company: { select: { name: true } },
        job: { select: { title: true } },
      },
    });
    return {
      ok: true,
      data: rows.map((row) => ({
        id: row.id,
        company: row.company?.name ?? row.folderName,
        role: row.roleTitle || row.job?.title || null,
      })),
    };
  } catch (err) {
    console.error("[admin] search applications failed", safeDbError(err));
    return { ok: false, message };
  }
}
