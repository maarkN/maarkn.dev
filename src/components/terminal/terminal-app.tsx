"use client";

import { useMemo, type ReactNode } from "react";
import { createContentCommands } from "@/lib/terminal/content-commands";
import { FILE_NAMES } from "@/lib/terminal/files";
import type { TerminalData } from "@/lib/terminal/types";
import { TerminalShell } from "./terminal-shell";
import type { TerminalLabels } from "./types";

/**
 * The terminal as the site ships it: the shell with the content commands
 * registered (before the system ones, in mockup order) and `ls`/`cat`'s
 * file names wired into Tab completion. Commands hold functions, so they
 * are created here on the client from the serialisable `data` the page
 * loaded on the server.
 */
export function TerminalApp({
  labels,
  locale,
  data,
  motd,
}: {
  labels: TerminalLabels;
  locale: string;
  data: TerminalData;
  /** Server-rendered MOTD, placed above the output. */
  motd: ReactNode;
}) {
  const commands = useMemo(() => createContentCommands(labels), [labels]);

  return (
    <TerminalShell
      labels={labels}
      locale={locale}
      motd={motd}
      commands={commands}
      files={FILE_NAMES}
      data={data}
    />
  );
}
