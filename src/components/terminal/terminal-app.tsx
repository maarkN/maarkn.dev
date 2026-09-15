"use client";

import { useMemo, type ReactNode } from "react";
import { createAskCommand, createAskFallback } from "@/lib/terminal/ask-command";
import { createContentCommands } from "@/lib/terminal/content-commands";
import { FILE_NAMES } from "@/lib/terminal/files";
import { createNavCommands, DIRECTORY_NAMES } from "@/lib/terminal/nav-commands";
import type { OutputLine, TerminalData } from "@/lib/terminal/types";
import { TerminalShell } from "./terminal-shell";
import type { OutputEntry, TerminalLabels } from "./types";

/**
 * The terminal as the site ships it: the shell with the content commands
 * and `ask` registered (before the system ones, in mockup order), the
 * navigation commands (`cd`, `pwd`, `lang`) after them, the optional
 * unknown-input fallback to the assistant and `ls`/`cat`'s file names
 * wired into Tab completion. Commands hold functions, so they
 * are created here on the client from the serialisable `data` the page
 * loaded on the server. `initialLines` is the output the server already
 * rendered (whoami + sitemap): it is adopted as the first lines of the
 * session, already on screen, so nothing is printed twice on hydration.
 */
export function TerminalApp({
  labels,
  locale,
  data,
  motd,
  initialLines,
}: {
  labels: TerminalLabels;
  locale: string;
  data: TerminalData;
  /** Server-rendered MOTD, placed above the output. */
  motd: ReactNode;
  /** Lines rendered by the server as the session's first output. */
  initialLines?: OutputLine[];
}) {
  const commands = useMemo(
    () => [...createContentCommands(labels), createAskCommand(labels), ...createNavCommands(labels)],
    [labels],
  );
  const fallback = useMemo(() => createAskFallback(labels), [labels]);
  // Already visible when the HTML arrives: no entrance animation, no stagger.
  const initial = useMemo<OutputEntry[]>(
    () => (initialLines ?? []).map((line, index) => ({ id: 0, line, index, instant: true })),
    [initialLines],
  );

  return (
    <TerminalShell
      labels={labels}
      locale={locale}
      motd={motd}
      commands={commands}
      files={FILE_NAMES}
      directories={DIRECTORY_NAMES}
      fallback={fallback}
      data={data}
      initialLines={initial}
    />
  );
}
