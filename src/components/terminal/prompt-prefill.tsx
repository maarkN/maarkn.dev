"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * `?cmd=ask` — where the old `/chat` route now lands — leaves `ask ` typed
 * in the prompt so the visitor only has to add the question. Reads the URL on
 * the client (inside a Suspense boundary) to keep the home prerendered; the
 * general `?cmd=` deep-link that runs commands arrives with change 09.
 */
export function PromptPrefill({ onPrefill }: { onPrefill: (value: string) => void }) {
  const cmd = useSearchParams().get("cmd");

  useEffect(() => {
    if (cmd === "ask") onPrefill("ask ");
  }, [cmd, onPrefill]);

  return null;
}
