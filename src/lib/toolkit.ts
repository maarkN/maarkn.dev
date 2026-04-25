export type ToolkitGroupKey =
  | "frontend"
  | "backend"
  | "mobile"
  | "data"
  | "infra"
  | "practices";

export type Tool = {
  name: string;
  years?: number;
  /** Self-rated proficiency 0–100. Drives the metric bar in the Toolkit grid. */
  proficiency: number;
};

export const toolkit: Record<ToolkitGroupKey, Tool[]> = {
  frontend: [
    { name: "TypeScript", years: 6, proficiency: 95 },
    { name: "React", years: 5, proficiency: 92 },
    { name: "Next.js", years: 4, proficiency: 90 },
    { name: "Vue.js", years: 3, proficiency: 78 },
    { name: "Nuxt", years: 3, proficiency: 76 },
    { name: "Astro", years: 1, proficiency: 70 },
    { name: "Tailwind CSS", years: 4, proficiency: 88 },
    { name: "HTML / CSS", years: 6, proficiency: 92 },
  ],
  backend: [
    { name: "Node.js", years: 6, proficiency: 95 },
    { name: "NestJS", years: 4, proficiency: 92 },
    { name: "Express", years: 5, proficiency: 88 },
    { name: "REST APIs", years: 6, proficiency: 94 },
    { name: "Microservices", years: 4, proficiency: 85 },
    { name: "Kafka", years: 2, proficiency: 70 },
    { name: "RabbitMQ", years: 3, proficiency: 76 },
    { name: "WebSockets", years: 3, proficiency: 82 },
  ],
  mobile: [
    { name: "Flutter", years: 3, proficiency: 85 },
    { name: "React Native", years: 2, proficiency: 72 },
    { name: "Dart", years: 3, proficiency: 84 },
    { name: "Firebase", years: 3, proficiency: 80 },
    { name: "In-App Purchases", years: 2, proficiency: 75 },
    { name: "App Store / Play Store", years: 2, proficiency: 78 },
  ],
  data: [
    { name: "PostgreSQL", years: 6, proficiency: 90 },
    { name: "MongoDB", years: 5, proficiency: 88 },
    { name: "Redis", years: 5, proficiency: 84 },
    { name: "Elastic Search", years: 2, proficiency: 68 },
    { name: "BigQuery", years: 1, proficiency: 60 },
    { name: "ETL / Web crawling", years: 3, proficiency: 82 },
    { name: "Vector stores · LLM", years: 1, proficiency: 72 },
  ],
  infra: [
    { name: "Docker", years: 6, proficiency: 88 },
    { name: "AWS", years: 5, proficiency: 82 },
    { name: "GCP", years: 2, proficiency: 68 },
    { name: "Nginx", years: 4, proficiency: 78 },
    { name: "Linux", years: 6, proficiency: 86 },
    { name: "OAuth2 / Keycloak", years: 3, proficiency: 80 },
    { name: "CI/CD", years: 5, proficiency: 84 },
  ],
  practices: [
    { name: "DDD", years: 4, proficiency: 84 },
    { name: "SOLID", proficiency: 88 },
    { name: "TDD", proficiency: 76 },
    { name: "Design Patterns", proficiency: 86 },
    { name: "Code review · Mentoring", proficiency: 90 },
    { name: "Multitenancy", proficiency: 82 },
    { name: "SEO-focused dev", proficiency: 74 },
    { name: "Stakeholder communication", proficiency: 88 },
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
