import { getDictionary, hasLocale, defaultLocale, type Locale } from "@/i18n/config";
import { OG_CONTENT_TYPE, OG_SIZE, terminalOgImage } from "@/lib/og";

export const alt = "Marco Filho — selected work";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** `ls projects/` as a social card. */
export default async function OpengraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l: Locale = hasLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(l);

  return terminalOgImage({
    locale: l,
    path: "~/projects",
    command: "ls projects/",
    title: dict.projects.page.title,
    subtitle: dict.projects.page.sub,
  });
}
