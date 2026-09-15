"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Reads `?cmd=` and hands it to the shell once the terminal is usable (after
 * the boot, or at once when the session already booted). Lives in its own
 * Suspense boundary: `useSearchParams` bails out of prerendering, and this
 * way only this empty component does, not the shell around it. The value is
 * sanitised by the shell against the registry; `?cmd=ask` (where `/chat`
 * lands) leaves `ask ` typed instead of running anything. Each value is
 * handed over once: a `reboot` or a re-render does not run it again.
 */
export function DeepLink({
  ready,
  onCommand,
}: {
  ready: boolean;
  onCommand: (raw: string) => void;
}) {
  const cmd = useSearchParams().get("cmd");
  const consumed = useRef<string | null>(null);
  const handler = useRef(onCommand);

  useEffect(() => {
    handler.current = onCommand;
  }, [onCommand]);

  // `consumed` guards re-renders and `reboot` within one mount; the back
  // button remounts the shell, so that case is `sessionStorage.cmd`'s job
  // (see `runDeepLink`). Neither replaces the other.
  useEffect(() => {
    if (!ready || !cmd || consumed.current === cmd) return;
    consumed.current = cmd;
    handler.current(cmd);
  }, [ready, cmd]);

  return null;
}
