import { beforeEach, describe, expect, it, vi } from "vitest";

// `projects-repo` e um modulo de servidor: fora do RSC o `server-only` lanca,
// e o Prisma abriria conexao. As duas coisas viram stub aqui.
vi.mock("server-only", () => ({}));

const findMany = vi.fn();
vi.mock("@/lib/db", () => ({ db: { project: { findMany } } }));

const { getAllProjects } = await import("@/lib/projects-repo");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    slug: "demo",
    name: "Demo",
    year: "2026",
    category: "web",
    status: "live",
    featured: true,
    monogram: "DM",
    accentFrom: "#4f6ef7",
    accentTo: "#22d3ee",
    stackJson: JSON.stringify(["ts"]),
    sourceVisibility: "public",
    repoUrl: null,
    demoUrl: null,
    caseUrl: null,
    coverImage: null,
    tagline: null,
    description: null,
    role: null,
    featuresJson: JSON.stringify([]),
    createdAt: new Date(),
    ...overrides,
  };
}

describe("projects-repo — allowlist de esquema no caminho de leitura", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it.each([
    "javascript:alert(document.domain)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "//evil.example/pwn",
  ])("descarta link %s gravado no banco", async (hostile) => {
    findMany.mockResolvedValue([
      row({ repoUrl: hostile, demoUrl: hostile, caseUrl: hostile }),
    ]);

    const [project] = await getAllProjects();

    expect(project!.links).toEqual({
      repo: undefined,
      demo: undefined,
      case: undefined,
    });
  });

  it("preserva links http(s) legitimos", async () => {
    findMany.mockResolvedValue([
      row({
        repoUrl: "https://github.com/maarkN/maarkn.dev",
        demoUrl: "http://localhost:5050",
        caseUrl: "https://example.com/case",
      }),
    ]);

    const [project] = await getAllProjects();

    expect(project!.links).toEqual({
      repo: "https://github.com/maarkN/maarkn.dev",
      demo: "http://localhost:5050",
      case: "https://example.com/case",
    });
  });
});
