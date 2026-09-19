"use client";

/**
 * The whole point of this screen is `Cmd+P → save as PDF` (the vault still has
 * 17 packages with a pending PDF). Surfacing the browser print dialog as a
 * button removes one manual step; it is `print:hidden`, so it never shows up in
 * the printed document.
 */

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" size="sm" onClick={() => window.print()}>
      <Printer className="size-4" />
      [ imprimir / salvar pdf ]
    </Button>
  );
}
