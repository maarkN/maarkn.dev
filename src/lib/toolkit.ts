export type ToolkitGroupKey =
  | "frontend"
  | "backend"
  | "mobile"
  | "data"
  | "infra"
  | "practices";

export type Tool = { name: string; years?: number };

export const toolkit: Record<ToolkitGroupKey, Tool[]> = {
  frontend: [
    { name: "TypeScript", years: 6 },
    { name: "React", years: 5 },
    { name: "Next.js", years: 4 },
    { name: "Vue.js", years: 3 },
    { name: "Nuxt", years: 3 },
    { name: "Astro", years: 1 },
    { name: "Tailwind CSS", years: 4 },
    { name: "HTML / CSS", years: 6 },
  ],
  backend: [
    { name: "Node.js", years: 6 },
    { name: "NestJS", years: 4 },
    { name: "Express", years: 5 },
    { name: "REST APIs", years: 6 },
    { name: "Microservices", years: 4 },
    { name: "Kafka", years: 2 },
    { name: "RabbitMQ", years: 3 },
    { name: "WebSockets", years: 3 },
  ],
  mobile: [
    { name: "Flutter", years: 3 },
    { name: "React Native", years: 2 },
    { name: "Dart", years: 3 },
    { name: "Firebase", years: 3 },
    { name: "In-App Purchases", years: 2 },
    { name: "App Store / Play Store", years: 2 },
  ],
  data: [
    { name: "PostgreSQL", years: 6 },
    { name: "MongoDB", years: 5 },
    { name: "Redis", years: 5 },
    { name: "Elastic Search", years: 2 },
    { name: "BigQuery", years: 1 },
    { name: "ETL / Web crawling", years: 3 },
    { name: "Vector stores · LLM", years: 1 },
  ],
  infra: [
    { name: "Docker", years: 6 },
    { name: "AWS", years: 5 },
    { name: "GCP", years: 2 },
    { name: "Nginx", years: 4 },
    { name: "Linux", years: 6 },
    { name: "OAuth2 / Keycloak", years: 3 },
    { name: "CI/CD", years: 5 },
  ],
  practices: [
    { name: "DDD", years: 4 },
    { name: "SOLID" },
    { name: "TDD" },
    { name: "Design Patterns" },
    { name: "Code review · Mentoring" },
    { name: "Multitenancy" },
    { name: "SEO-focused dev" },
    { name: "Stakeholder communication" },
  ],
};

export const groupOrder: ToolkitGroupKey[] = [
  "frontend",
  "backend",
  "mobile",
  "data",
  "infra",
  "practices",
];
