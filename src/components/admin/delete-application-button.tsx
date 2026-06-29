"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteApplication } from "@/app/_actions/applications";

export function DeleteApplicationButton({ id, company }: { id: string; company: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm(`Delete "${company}"? This cannot be undone.`)) return;
        start(() => deleteApplication(id));
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
