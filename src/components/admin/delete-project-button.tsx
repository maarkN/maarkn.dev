"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProject } from "@/app/_actions/admin-projects";

export function DeleteProjectButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        const ok = window.confirm(`Delete "${name}"? This cannot be undone.`);
        if (!ok) return;
        start(() => deleteProject(id));
      }}
      disabled={pending}
      className="inline-flex h-8 w-8 items-center justify-center border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--red)] hover:text-[var(--red)] disabled:opacity-50"
      aria-label="Delete"
      title="Delete"
    >
      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}
