import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/i18n/config";
import { loadTerminalData } from "@/lib/terminal/data";
import { Motd } from "@/components/terminal/motd";
import { TerminalApp } from "@/components/terminal/terminal-app";

// Preview route for the terminal shell. It becomes the home in change 06 and
// this file goes away then; until that, keep it out of search indexes.
export const metadata: Metadata = {
  title: "Terminal",
  robots: { index: false, follow: false },
};

// Same caching as the home: prerendered, revalidated hourly, so a project
// created in the admin shows up in `projects` after the next revalidation.
export const revalidate = 3600;

export default async function TerminalPreviewPage({
  params,
}: PageProps<"/[lang]/terminal">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const data = await loadTerminalData(dict);

  return (
    <TerminalApp
      labels={dict.terminal}
      locale={lang}
      data={data}
      motd={<Motd labels={dict.terminal.motd} numbers={dict.bigNumbers.items} />}
    />
  );
}
