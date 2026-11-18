export type ProjectCategory =
  | "web"
  | "mobile"
  | "ai"
  | "backend"
  | "client";

export type ProjectStatus = "live" | "internal" | "nda" | "archived";
export type SourceVisibility = "public" | "private";

type ProjectGalleryItem = {
  /** Public URL or path served by /public. Stylized placeholders are fine. */
  url: string;
  /** Optional caption key, looked up in the project's dictionary entry. */
  captionKey?: string;
  /** Two-letter monogram for stylized placeholder covers. */
  monogram?: string;
  /** Optional accent gradient override for stylized placeholders. */
  accent?: { from: string; to: string };
};

export type Project = {
  slug: string;
  name: string;
  year: string;
  category: ProjectCategory;
  status: ProjectStatus;
  featured: boolean;
  /** Two letters used in the stylized cover. */
  monogram: string;
  /** Pair of accent colors used in the cover gradient. */
  accent: { from: string; to: string };
  stack: string[];
  /** Defaults to "public" when omitted. "private" hides the repo CTA in favor of a Private project pill. */
  sourceVisibility?: SourceVisibility;
  /** Optional gallery shown on the detail page below the hero. */
  gallery?: ProjectGalleryItem[];
  links?: { repo?: string; demo?: string; case?: string };
  /** Optional uploaded cover image path (served by /uploads/...). */
  coverImage?: string | null;
};

export const projects: Project[] = [
  {
    slug: "remote-harness",
    name: "Remote Harness",
    year: "2026",
    category: "mobile",
    status: "live",
    featured: true,
    monogram: "RH",
    accent: { from: "#22d3ee", to: "#a78bfa" },
    stack: ["React Native", "Expo", "Node.js", "Go", "Noise Protocol"],
    sourceVisibility: "public",
    links: { repo: "https://github.com/maarkN/remote-harness", demo: "https://remoteharness.app" },
  },
  {
    slug: "go-v2-fiscal-backend",
    name: "GO v2 · Tax Platform",
    year: "2026",
    category: "backend",
    status: "internal",
    featured: true,
    monogram: "GO",
    accent: { from: "#22d3ee", to: "#4f6ef7" },
    stack: ["Go", "PostgreSQL", "OpenAPI", "Docker", "GitHub Actions"],
    sourceVisibility: "private",
    links: {},
  },
  {
    slug: "dermatology-ai-platform",
    name: "Dermagenix",
    year: "2026",
    category: "ai",
    status: "live",
    featured: true,
    monogram: "DG",
    accent: { from: "#ec4899", to: "#a78bfa" },
    stack: ["NestJS", "React", "React Native", "PostgreSQL + pgvector", "OpenAI"],
    sourceVisibility: "private",
    links: { demo: "https://dermagenix.pro" },
  },
  {
    slug: "medical-shift-marketplace",
    name: "DoctorX",
    year: "2026",
    category: "mobile",
    status: "internal",
    featured: true,
    monogram: "DX",
    accent: { from: "#4f6ef7", to: "#22c55e" },
    stack: ["NestJS", "PostgreSQL + PostGIS", "Flutter", "React", "Redis"],
    sourceVisibility: "private",
    links: { demo: "https://doctorx.tech" },
  },
  {
    slug: "drug-leaflet-platform",
    name: "Bula Digital",
    year: "2025",
    category: "web",
    status: "internal",
    featured: true,
    monogram: "BD",
    accent: { from: "#f97316", to: "#fb7185" },
    stack: ["NestJS", "Astro", "MongoDB", "Meilisearch", "OpenAI"],
    sourceVisibility: "private",
    links: {},
  },
  {
    slug: "voip-platform",
    name: "SenseVox",
    year: "2024",
    category: "backend",
    status: "archived",
    featured: true,
    monogram: "SV",
    accent: { from: "#ff6b6b", to: "#ff2d8e" },
    stack: ["NestJS", "Asterisk", "MongoDB", "RabbitMQ", "Python"],
    sourceVisibility: "private",
    links: {},
  },
  {
    slug: "municipalities-chatbot",
    name: "Canal Cidadão",
    year: "2024",
    category: "ai",
    status: "archived",
    featured: true,
    monogram: "CC",
    accent: { from: "#22c55e", to: "#84cc16" },
    stack: ["NestJS", "LangGraph", "Qdrant", "OpenAI", "Puppeteer"],
    sourceVisibility: "private",
    links: {},
  },
  {
    slug: "miami-real-estate-assistant",
    name: "Miami Real Estate Assistant",
    year: "2025",
    category: "ai",
    status: "archived",
    featured: true,
    monogram: "MR",
    accent: { from: "#4f6ef7", to: "#22d3ee" },
    stack: ["NestJS", "LangChain", "OpenAI", "Qdrant", "RabbitMQ"],
    sourceVisibility: "private",
    links: {},
  },
  {
    slug: "carbon-credit-platform",
    name: "Valora Carbon",
    year: "2025",
    category: "ai",
    status: "archived",
    featured: false,
    monogram: "VC",
    accent: { from: "#16a34a", to: "#facc15" },
    stack: ["NestJS", "MongoDB", "BullMQ", "OpenAI", "React"],
    sourceVisibility: "private",
    links: {},
  },
  {
    slug: "museum-institutional-site",
    name: "Julius Meili Numismatic Museum",
    year: "2026",
    category: "web",
    status: "internal",
    featured: false,
    monogram: "JM",
    accent: { from: "#a855f7", to: "#ec4899" },
    stack: ["Astro", "React", "Ghost", "Directus", "Traefik"],
    sourceVisibility: "private",
    links: {},
  },
  {
    slug: "betting-audit-kyc",
    name: "Betting Platform Audit & KYC",
    year: "2025",
    category: "web",
    status: "nda",
    featured: false,
    monogram: "KY",
    accent: { from: "#7b93ff", to: "#22d3ee" },
    stack: ["Next.js", "TypeScript", "face-api.js", "Tesseract.js", "Socket.IO"],
    sourceVisibility: "private",
    links: {},
  },
  {
    slug: "agritech-field-sales-platform",
    name: "Agritech Field Sales Platform",
    year: "2026",
    category: "mobile",
    status: "nda",
    featured: false,
    monogram: "AF",
    accent: { from: "#84cc16", to: "#16a34a" },
    stack: ["React Native", "Expo", "WatermelonDB", "Spring Boot", "Traefik"],
    sourceVisibility: "private",
    links: {},
  },
  {
    slug: "jobradar-ai",
    name: "JobRadar AI",
    year: "2026",
    category: "ai",
    status: "archived",
    featured: false,
    monogram: "JR",
    accent: { from: "#facc15", to: "#22d3ee" },
    stack: ["Python", "LangGraph", "Qdrant", "FastAPI", "Anthropic API"],
    sourceVisibility: "public",
    links: { repo: "https://github.com/maarkN/jobradar-ai" },
  },
  {
    slug: "maarkn-dev",
    name: "maarkn.dev",
    year: "2026",
    category: "web",
    status: "live",
    featured: false,
    monogram: "MK",
    accent: { from: "#4f6ef7", to: "#a78bfa" },
    stack: ["Next.js", "TypeScript", "PostgreSQL + pgvector", "OpenAI", "Docker"],
    sourceVisibility: "public",
    links: { repo: "https://github.com/maarkN/maarkn.dev", demo: "https://maarkn.dev" },
  },
  {
    slug: "collectprime-app",
    name: "CollectPrime",
    year: "2021",
    category: "mobile",
    status: "archived",
    featured: false,
    monogram: "CP",
    accent: { from: "#a855f7", to: "#22d3ee" },
    stack: ["Flutter", "In-App Purchase", "Node.js", "NestJS", "MongoDB"],
    sourceVisibility: "private",
    links: {},
  },
  {
    slug: "locasty",
    name: "Locasty",
    year: "2021",
    category: "web",
    status: "archived",
    featured: false,
    monogram: "LC",
    accent: { from: "#16a34a", to: "#22d3ee" },
    stack: ["React", "Node.js", "TypeScript", "PostgreSQL", "Google Cloud Pub/Sub"],
    sourceVisibility: "private",
    links: {},
  },
  {
    slug: "fintech-loan-api",
    name: "Sevencred",
    year: "2023",
    category: "backend",
    status: "archived",
    featured: false,
    monogram: "SC",
    accent: { from: "#7b93ff", to: "#a78bfa" },
    stack: ["NestJS", "Flutter", "MongoDB", "Apache Airflow", "Playwright"],
    sourceVisibility: "private",
    links: {},
  },
];

/**
 * Slugs that used to be on the site and were removed because the Career Bank
 * doesn't support them. `scripts/sync-projects.ts` deletes them from the DB.
 */
export const retiredProjectSlugs: string[] = ["vanilla-farming-assistant"];

export const projectCategories: ProjectCategory[] = [
  "web",
  "mobile",
  "ai",
  "backend",
  "client",
];
