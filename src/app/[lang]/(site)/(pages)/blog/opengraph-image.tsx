import { getDictionary, hasLocale, defaultLocale, type Locale } from "@/i18n/config";
import { OG_CONTENT_TYPE, OG_SIZE, terminalOgImage } from "@/lib/og";

export const alt = "Marco Filho — writing";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** `ls blog/` as a social card. */
export default async function OpengraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l: Locale = hasLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(l);

  return terminalOgImage({
    locale: l,
    path: "~/blog",
    command: "ls blog/",
    title: dict.blog.title,
    subtitle: dict.blog.sub,
  });
}
