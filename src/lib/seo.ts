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
type SeoCopy = { title: string; description: string; ogLocale: string };

export const seoByLocale: Record<Locale, SeoCopy> = {
  en: {
    title: "Marco Filho — maarkn@dev",
    description:
      "Marco Filho — Senior AI/LLM & Backend Engineer. 6+ years, 20+ products shipped end-to-end. Open to senior roles in the EU and Canada.",
    ogLocale: "en_US",
  },
  "pt-BR": {
    title: "Marco Filho — maarkn@dev",
    description:
      "Marco Filho — Engenheiro Sênior de IA/LLM & Backend. 6+ anos, 20+ produtos entregues de ponta a ponta. Aberto a vagas sênior na UE e no Canadá.",
    ogLocale: "pt_BR",
  },
};

// Recruiter- and ATS-oriented keywords; also help topical relevance.
export const KEYWORDS = [
  "Marco Filho",
  "maarkn",
  "senior backend engineer",
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
  "relocate EU",
  "EU Blue Card",
  "Critical Skills Permit",
  "healthtech",
  "fintech",
  "govtech",
];

// hreflang map (relative paths resolved against metadataBase).
export const languageAlternates: Record<string, string> = {
  en: "/en",
  "pt-BR": "/pt-BR",
  "x-default": "/en",
};

// --- JSON-LD (schema.org) ---

export function personLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: AUTHOR,
    alternateName: "maarkn",
    url: `${SITE_URL}/${locale}`,
    image: `${SITE_URL}/${locale}/opengraph-image`,
    jobTitle: "Senior AI/LLM & Backend Engineer",
    description: seoByLocale[locale].description,
    email: "mailto:markimkr@gmail.com",
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
      "Distributed systems",
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
