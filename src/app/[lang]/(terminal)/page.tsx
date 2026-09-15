import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale, defaultLocale } from "@/i18n/config";
import { languageAlternates } from "@/lib/seo";
import { loadTerminalData } from "@/lib/terminal/data";
import { initialOutput } from "@/components/terminal/initial-output";
import { Motd } from "@/components/terminal/motd";
import { TerminalApp } from "@/components/terminal/terminal-app";

// ISR: prerender the home and revalidate hourly instead of server-rendering on
// every request. The data loaders fall back to static content when the DB or
// the CMS is unavailable (e.g. at build time), so prerendering is safe.
export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const l = hasLocale(lang) ? lang : defaultLocale;
  return {
    alternates: { canonical: `/${l}`, languages: languageAlternates },
  };
}

/**
 * The home is the terminal. The HTML already carries the MOTD, the `whoami`
 * output and a sitemap line, so crawlers and visitors without JavaScript get
 * the bio and every link; the shell adopts those lines when it hydrates.
 */
export default async function HomePage({ params }: PageProps<"/[lang]">) {
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
      initialLines={initialOutput({ labels: dict.terminal, locale: lang, data })}
    />
  );
}
