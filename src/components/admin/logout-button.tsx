"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/_actions/auth";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <LogOut className="h-3 w-3" strokeWidth={2.2} />
        Sign out
      </button>
    </form>
  );
}
