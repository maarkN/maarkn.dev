"use client";

/**
 * "Create an application from this job".
 *
 * Rendered straight from the `rows.map()` of the Server Component: it receives
 * serializable props and imports the Server Action itself. The navigation is
 * HERE and not in the action: an action that calls `redirect()` never returns,
 * and without a return there is no notice (AGENTS.md §2).
 */

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import type { ActionResult } from "@/app/_actions/action-result";
import { createApplicationFromJob } from "@/app/_actions/jobs";
import { useCommonLabels } from "@/components/admin/admin-locale";
import { useNotify } from "@/components/admin/notify";
import { Button } from "@/components/ui/button";

export function PromoteJobButton({ jobId, label }: { jobId: string; /** "Criar candidatura a partir de …". */ label: string }) {
  const router = useRouter();
  const notify = useNotify();
  const common = useCommonLabels();
  const [isPending, startTransition] = useTransition();

  function promote() {
    startTransition(async () => {
      // The action does not throw (`ActionResult`); a network failure might.
      const result = await createApplicationFromJob(jobId).catch((): ActionResult<never> => ({
        ok: false,
        message: common.failed,
      }));
      if (!result.ok || !result.data) {
        notify.error(result.ok ? common.failed : result.message, { action: { label: common.retry, onClick: promote } });
        return;
      }
      if (result.message) notify.success(result.message);
      router.push(`/admin/applications/${result.data.id}`);
    });
  }

  return (
    <Button type="button" variant="ghost" size="icon-sm" disabled={isPending} aria-label={label} title={label} onClick={promote}>
      <Sparkles aria-hidden="true" />
    </Button>
  );
}
