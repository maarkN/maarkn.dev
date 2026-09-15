import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { Motd } from "@/components/terminal/motd";
import { TerminalShell } from "@/components/terminal/terminal-shell";

// Preview route for the terminal shell. It becomes the home in change 06 and
// this file goes away then; until that, keep it out of search indexes.
export const metadata: Metadata = {
  title: "Terminal",
  robots: { index: false, follow: false },
};

export default async function TerminalPreviewPage({
  params,
}: PageProps<"/[lang]/terminal">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  return (
    <TerminalShell
      labels={dict.terminal}
      motd={<Motd labels={dict.terminal.motd} numbers={dict.bigNumbers.items} />}
    />
  );
}
