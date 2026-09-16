import { getDictionary, hasLocale, defaultLocale, type Locale } from "@/i18n/config";
import { OG_CONTENT_TYPE, OG_SIZE, terminalOgImage } from "@/lib/og";
import { site } from "@/lib/site";

// Social card of the home (LinkedIn, X, Slack previews), per locale: the
// terminal running `whoami`. Inner pages ship their own card next to them.
export const alt = "Marco Filho — Senior AI/LLM & Backend Engineer";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l: Locale = hasLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(l);
  const { motd, whoami } = dict.terminal;
  const numbers = dict.bigNumbers.items;

  return terminalOgImage({
    locale: l,
    path: "~",
    command: "whoami",
    title: site.name,
    subtitle: whoami.role,
    lines: [
      motd.location,
      motd.summary
        .replace("{years}", numbers.years.value)
        .replace("{products}", numbers.projects.value),
    ],
    status: motd.status,
  });
}
