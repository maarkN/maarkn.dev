export type ProjectCategory =
  | "web"
  | "mobile"
  | "ai"
  | "backend"
  | "client";

export type ProjectStatus = "live" | "internal" | "nda" | "archived";

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
  links?: { repo?: string; demo?: string; case?: string };
};

export const projects: Project[] = [
  {
    slug: "miami-real-estate-assistant",
    name: "Miami Real Estate Assistant",
    year: "2025",
    category: "ai",
    status: "live",
    featured: true,
    monogram: "MR",
    accent: { from: "#4f6ef7", to: "#22d3ee" },
    stack: ["TypeScript", "NestJS", "LLM · MCP", "MLS", "WhatsApp"],
    links: {},
  },
  {
    slug: "municipalities-chatbot",
    name: "Municipalities Chatbot",
    year: "2024",
    category: "ai",
    status: "live",
    featured: true,
    monogram: "MC",
    accent: { from: "#22c55e", to: "#84cc16" },
    stack: ["TypeScript", "Vector store", "Web crawling", "WhatsApp"],
    links: {},
  },
  {
    slug: "voip-platform",
    name: "VoIP Platform",
    year: "2024",
    category: "backend",
    status: "internal",
    featured: true,
    monogram: "VP",
    accent: { from: "#ff6b6b", to: "#ff2d8e" },
    stack: ["NestJS", "Asterisk", "WebSockets", "MongoDB", "Redis"],
    links: {},
  },
  {
    slug: "fintech-loan-api",
    name: "Fintech Loan API",
    year: "2023",
    category: "backend",
    status: "nda",
    featured: true,
    monogram: "FL",
    accent: { from: "#7b93ff", to: "#a78bfa" },
    stack: ["NestJS", "Microservices", "Flutter", "MongoDB", "Government APIs"],
    links: {},
  },
  {
    slug: "carbon-credit-platform",
    name: "Carbon Credit Platform",
    year: "2025",
    category: "ai",
    status: "live",
    featured: true,
    monogram: "CC",
    accent: { from: "#16a34a", to: "#facc15" },
    stack: ["TypeScript", "LLM", "PDF generation", "NestJS"],
    links: {},
  },
  {
    slug: "drug-leaflet-platform",
    name: "Drug Leaflet Platform",
    year: "2025",
    category: "web",
    status: "live",
    featured: true,
    monogram: "DL",
    accent: { from: "#f97316", to: "#fb7185" },
    stack: ["Astro", "NestJS", "Web crawling", "SEO"],
    links: {},
  },
  {
    slug: "museum-institutional-site",
    name: "Museum Institutional Site",
    year: "2024",
    category: "web",
    status: "live",
    featured: false,
    monogram: "MI",
    accent: { from: "#a855f7", to: "#ec4899" },
    stack: ["Ghost CMS", "Handlebars", "SEO", "Kiosk webframes"],
    links: {},
  },
  {
    slug: "vanilla-farming-assistant",
    name: "Vanilla Farming Assistant",
    year: "2024",
    category: "ai",
    status: "live",
    featured: false,
    monogram: "VF",
    accent: { from: "#facc15", to: "#22d3ee" },
    stack: ["LLM", "Vector store", "WhatsApp", "Domain knowledge"],
    links: {},
  },
];

export const featuredProjects = projects.filter((p) => p.featured);

export const projectCategories: ProjectCategory[] = [
  "web",
  "mobile",
  "ai",
  "backend",
  "client",
];
