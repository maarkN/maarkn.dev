import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";

// Single source of truth for SEO metadata, structured data and social cards.
export const SITE_URL = "https://maarkn.dev";
export const SITE_NAME = "maarkn.dev";
export const AUTHOR = "Marco Filho";

const SAME_AS = [
  "https://www.linkedin.com/in/maarkn",
  "https://github.com/maarkn",
];

// The home title is the prompt's user@host, the same in both locales.
type SeoCopy = { title: string; description: string; jobTitle: string; ogLocale: string };

export const seoByLocale: Record<Locale, SeoCopy> = {
  en: {
    title: "Marco Filho — maarkn@dev",
    description:
      "Marco Filho — Senior Fullstack Engineer and Tech Lead building Go and TypeScript backends, web and mobile apps, and LLM features. 6+ years, 20+ products built. Open to senior roles, remote or with relocation.",
    jobTitle: "Senior Fullstack Engineer · Tech Lead",
    ogLocale: "en_US",
  },
  "pt-BR": {
    title: "Marco Filho — maarkn@dev",
    description:
      "Marco Filho — Engenheiro Fullstack Sênior e Tech Lead: backends em Go e TypeScript, apps web e mobile e funcionalidades com LLM. 6+ anos, 20+ produtos construídos. Aberto a vagas sênior, remotas ou com mudança de país.",
    jobTitle: "Engenheiro Fullstack Sênior · Tech Lead",
    ogLocale: "pt_BR",
  },
};

// Recruiter- and ATS-oriented keywords; also help topical relevance.
export const KEYWORDS = [
  "Marco Filho",
  "maarkn",
  "senior fullstack engineer",
  "senior backend engineer",
  "tech lead",
  "AI engineer",
  "LLM engineer",
  "RAG",
  "retrieval augmented generation",
  "LLM agents",
  "vector search",
  "Go",
  "Golang",
  "TypeScript",
  "NestJS",
  "Node.js",
  "Next.js",
  "React",
  "Flutter",
  "backend architecture",
  "software engineer Brazil",
  "remote software engineer",
  "React Native",
  "Kafka",
  "event-driven",
  "proptech",
  "healthtech",
  "fintech",
  "govtech",
];

/**
 * `alternates` of a public route: canonical + `hreflang` for both locales and
 * `x-default` (English). `path` is the locale-less path, e.g. `/projects/x`
 * or `` for the home.
 */
export function routeAlternates(locale: Locale, path = ""): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      en: `/en${path}`,
      "pt-BR": `/pt-BR${path}`,
      "x-default": `/en${path}`,
    },
  };
}

// --- JSON-LD (schema.org) ---

export function personLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: AUTHOR,
    alternateName: "maarkn",
    url: `${SITE_URL}/${locale}`,
    image: `${SITE_URL}/${locale}/opengraph-image`,
    jobTitle: seoByLocale[locale].jobTitle,
    description: seoByLocale[locale].description,
    email: "mailto:contact@maarkn.dev",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Goiânia",
      addressCountry: "BR",
    },
    sameAs: SAME_AS,
    knowsAbout: [
      "Backend engineering",
      "Applied AI",
      "LLM agents",
      "Retrieval-Augmented Generation",
      "Go",
      "TypeScript",
      "NestJS",
      "Event-driven systems",
      "API design",
      "PostgreSQL",
    ],
    knowsLanguage: ["en", "pt-BR"],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ["en", "pt-BR"],
    author: { "@type": "Person", name: AUTHOR, url: SITE_URL },
  };
}
