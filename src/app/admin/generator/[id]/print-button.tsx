"use client";

/**
 * The whole point of this screen is printing it to a PDF. Surfacing the
 * browser's print dialog as a button removes one manual step; it is
 * `print:hidden`, so it never shows in the printed document.
 */

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label }: { label: string }) {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer aria-hidden="true" />
      {label}
    </Button>
  );
}
