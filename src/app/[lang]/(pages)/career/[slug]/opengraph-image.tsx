import { getDictionary, hasLocale, defaultLocale, type Locale } from "@/i18n/config";
import { OG_CONTENT_TYPE, OG_SIZE, terminalOgImage } from "@/lib/og";
import { timelineBySlug } from "@/lib/timeline";

export const alt = "Marco Filho — career case";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** `cat career/<slug>.log` as a social card: role, company, period, tech. */
export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const l: Locale = hasLocale(lang) ? lang : defaultLocale;
  const dict = await getDictionary(l);
  const entry = timelineBySlug(slug);
  const labels = dict.terminal.pages.career;

  if (!entry) {
    return terminalOgImage({
      locale: l,
      path: "~/career",
      command: `cat career/${slug}.log`,
      title: labels.title,
      subtitle: labels.sub,
    });
  }

  const role =
    (dict.about.timeline as Record<string, { role: string }>)[entry.key]?.role ?? entry.company;
  const detail = (dict.career as { details: Record<string, { tagline: string } | undefined> })
    .details[entry.slug];

  return terminalOgImage({
    locale: l,
    path: `~/career/${slug}`,
    command: `cat career/${slug}.log`,
    title: `${role} — ${entry.company}`,
    subtitle: detail?.tagline,
    lines: [entry.period, entry.tech.join(" · ")],
    status: entry.current ? labels.current : undefined,
  });
}
