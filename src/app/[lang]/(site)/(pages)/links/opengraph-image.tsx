import { getDictionary, hasLocale, defaultLocale, type Locale } from "@/i18n/config";
import { OG_CONTENT_TYPE, OG_SIZE, terminalOgImage } from "@/lib/og";
import { site } from "@/lib/site";

export const alt = "Marco Filho — links";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const strip = (url: string) => url.replace(/^https?:\/\//i, "");

/** `cat links.sh` as a social card: name, role, the two channels that matter. */
export default async function OpengraphImage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l: Locale = hasLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(l);
  const labels = dict.links;

  return terminalOgImage({
    locale: l,
    path: "~/links",
    command: "cat links.sh",
    title: labels.name,
    subtitle: labels.role,
    lines: [site.email, `${strip(site.social.linkedin)} · ${strip(site.social.github)}`],
    status: labels.available,
  });
}
