type TimelineKey =
  | "imobitech"
  | "freelance"
  | "nectar"
  | "sevencred"
  | "collectprime"
  | "ecto"
  | "vendorhub"
  | "ecto1"
  | "collectgram1";

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

/**
 * Every role, newest first. Facts come from the Career Bank (~/Career/experiences);
 * the copy for each key lives in the dictionaries (`about.timeline`, `career.details`).
 */
export const timeline: TimelineEntry[] = [
  {
    key: "imobitech",
    slug: "imobitech",
    company: "Imobitech",
    period: "Apr 2026 — Now",
    monogram: "IM",
    accent: { from: "#22d3ee", to: "#4f6ef7" },
    tech: ["Go", "Apache Kafka", "PostgreSQL", "React", "Flutter"],
    current: true,
  },
  {
    key: "freelance",
    slug: "self-employed-freelance",
    company: "Maarkn Dev Solutions · Consulting",
    period: "Dec 2024 — Now",
    monogram: "MD",
    accent: { from: "#4f6ef7", to: "#22d3ee" },
    tech: ["NestJS", "LangGraph", "PostgreSQL", "React", "Flutter"],
    current: true,
  },
  {
    key: "nectar",
    slug: "nectar-crm",
    company: "Nectar CRM",
    period: "Jan 2024 — Nov 2024",
    monogram: "NC",
    accent: { from: "#ff6b6b", to: "#ff2d8e" },
    tech: ["NestJS", "Asterisk", "MongoDB", "RabbitMQ", "OpenAI Whisper"],
  },
  {
    key: "sevencred",
    slug: "sevencred",
    company: "Sevencred",
    period: "Aug 2022 — Jan 2024",
    monogram: "SC",
    accent: { from: "#7b93ff", to: "#a78bfa" },
    tech: ["Flutter", "NestJS", "Apache Kafka", "MongoDB", "Apache Airflow"],
  },
  {
    key: "collectprime",
    slug: "collectprime",
    company: "CollectPrime · Volunteer",
    period: "Nov 2021 — Dec 2025",
    monogram: "CP",
    accent: { from: "#a855f7", to: "#22d3ee" },
    tech: ["Flutter", "In-App Purchase", "Node.js", "NestJS", "MongoDB"],
  },
  {
    key: "ecto",
    slug: "ecto-digital-senior",
    company: "Ecto Digital",
    period: "Oct 2021 — Aug 2022",
    monogram: "ED",
    accent: { from: "#16a34a", to: "#facc15" },
    tech: ["React", "Node.js", "TypeScript", "PostgreSQL", "Google Cloud Pub/Sub"],
  },
  {
    key: "vendorhub",
    slug: "vendorhub-sistemas",
    company: "VendorHub Sistemas",
    period: "Jun 2021 — Oct 2021",
    monogram: "VH",
    accent: { from: "#f97316", to: "#fb7185" },
    tech: ["Nuxt.js", "Vue.js", "TypeScript", "NestJS", "MongoDB"],
  },
  {
    key: "ecto1",
    slug: "ecto-digital-fullstack",
    company: "Ecto Digital",
    period: "Feb 2021 — Jun 2021",
    monogram: "ED",
    accent: { from: "#22c55e", to: "#84cc16" },
    tech: ["React", "Redux", "Node.js", "TypeScript", "PostgreSQL"],
  },
  {
    key: "collectgram1",
    slug: "collectgram-jr",
    company: "Collectgram",
    period: "Feb 2020 — Jan 2021",
    monogram: "CG",
    accent: { from: "#a855f7", to: "#ec4899" },
    tech: ["Vue.js", "Nuxt.js", "Vuex", "BootstrapVue", "Sass"],
  },
];

export const timelineBySlug = (slug: string): TimelineEntry | undefined =>
  timeline.find((t) => t.slug === slug);
