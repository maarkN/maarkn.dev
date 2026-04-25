export type TimelineKey =
  | "freelance"
  | "nectar"
  | "sevencred"
  | "ecto"
  | "vendorhub"
  | "ecto1"
  | "collectgram1"
  | "collectgram0";

export type TimelineEntry = {
  key: TimelineKey;
  /** Used as the URL slug for the detail page. */
  slug: string;
  company: string;
  period: string;
  /** Two letters used in the parallax cover. */
  monogram: string;
  /** Hex pair driving the cover gradient. */
  accent: { from: string; to: string };
  /** Short tags surfaced on the detail header (locale-agnostic). */
  tech: string[];
  current?: boolean;
};

export const timeline: TimelineEntry[] = [
  {
    key: "freelance",
    slug: "self-employed-freelance",
    company: "Self-Employed · Freelance",
    period: "Dec 2024 — Now",
    monogram: "SE",
    accent: { from: "#4f6ef7", to: "#22d3ee" },
    tech: ["TypeScript", "NestJS", "Flutter", "LLM", "AWS"],
    current: true,
  },
  {
    key: "nectar",
    slug: "nectar-crm",
    company: "Nectar CRM",
    period: "Jan 2024 — Nov 2024",
    monogram: "NC",
    accent: { from: "#ff6b6b", to: "#ff2d8e" },
    tech: ["NestJS", "Asterisk", "WebSockets", "MongoDB", "Redis"],
  },
  {
    key: "sevencred",
    slug: "sevencred",
    company: "Sevencred",
    period: "Aug 2022 — Jan 2024",
    monogram: "SC",
    accent: { from: "#7b93ff", to: "#a78bfa" },
    tech: ["TypeScript", "NestJS", "Flutter", "MongoDB", "Microservices"],
  },
  {
    key: "ecto",
    slug: "ecto-digital-senior",
    company: "Ecto Digital",
    period: "Oct 2021 — Aug 2022",
    monogram: "ED",
    accent: { from: "#16a34a", to: "#facc15" },
    tech: ["TypeScript", "Express", "PostgreSQL", "WebSockets", "Redis"],
  },
  {
    key: "vendorhub",
    slug: "vendorhub-sistemas",
    company: "VendorHub",
    period: "Jun 2021 — Oct 2021",
    monogram: "VH",
    accent: { from: "#f97316", to: "#fb7185" },
    tech: ["Vue.js", "Nuxt", "NestJS", "MongoDB", "RabbitMQ"],
  },
  {
    key: "ecto1",
    slug: "ecto-digital-fullstack",
    company: "Ecto Digital",
    period: "Feb 2021 — Jun 2021",
    monogram: "ED",
    accent: { from: "#22c55e", to: "#84cc16" },
    tech: ["React", "Node.js", "TypeScript", "PostgreSQL"],
  },
  {
    key: "collectgram1",
    slug: "collectgram-jr",
    company: "Collectgram",
    period: "Feb 2020 — Jan 2021",
    monogram: "CG",
    accent: { from: "#a855f7", to: "#ec4899" },
    tech: ["Vue.js 2", "Vuex", "Nuxt", "Sass"],
  },
  {
    key: "collectgram0",
    slug: "collectgram-trainee",
    company: "Collectgram",
    period: "Jul 2019 — Jan 2020",
    monogram: "CG",
    accent: { from: "#facc15", to: "#22d3ee" },
    tech: ["Vue.js 2", "Vuex", "Sass", "Pug"],
  },
];

export const timelineBySlug = (slug: string): TimelineEntry | undefined =>
  timeline.find((t) => t.slug === slug);
