import { cn } from "@/lib/utils";

/**
 * A status by its word, in the language of the interface, with a mark of its
 * colour beside it: the colour is a second channel, never the only one.
 * Content, so solid. Server-safe.
 */
export function StatusWord({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={cn("size-2 shrink-0", tone)} />
      {children}
    </span>
  );
}
