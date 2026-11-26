"use client";

import { useId, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { counted } from "@/lib/admin/text";
import { useCommonLabels } from "./admin-locale";

/**
 * The filters of a list. On a phone they are behind a button that says how
 * many are applied, or the list would start a screen below its title; from a
 * tablet up they are always open.
 */
export function FilterPanel({ applied, children }: { applied: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { filters } = useCommonLabels();
  const id = useId();
  return (
    <div className="space-y-4">
      {/* The wrapper hides it: a hologram's own `display` outranks a utility. */}
      <div className="md:hidden">
        <Button type="button" variant="outline" aria-expanded={open} aria-controls={id} onClick={() => setOpen((current) => !current)}>
          <SlidersHorizontal aria-hidden="true" />
          {filters.label}
          {applied > 0 && <span className="text-muted-foreground">· {counted(filters.applied, applied)}</span>}
        </Button>
      </div>
      <div id={id} className={open ? undefined : "hidden md:block"}>
        {children}
      </div>
    </div>
  );
}
