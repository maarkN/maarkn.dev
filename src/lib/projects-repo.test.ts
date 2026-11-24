import { beforeEach, describe, expect, it, vi } from "vitest";

// `projects-repo` e um modulo de servidor: fora do RSC o `server-only` lanca,
// e o Prisma abriria conexao. As duas coisas viram stub aqui.
vi.mock("server-only", () => ({}));

const findMany = vi.fn();
const dbState = { configured: true };
vi.mock("@/lib/db", () => ({
  db: { project: { findMany } },
  get dbConfigured() {
    return dbState.configured;
  },
}));

const en = (await import("@/dictionaries/en.json")).default;
const ptBR = (await import("@/dictionaries/pt-BR.json")).default;
const { projects: seed } = await import("@/lib/projects");
const { getAllProjects, getFeaturedProjects, getProjectBySlug, getSuccessCases, sortByCuratedOrder } =
  await import("@/lib/projects-repo");

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
    taglinePt: null,
    description: null,
    descriptionPt: null,
    role: null,
    rolePt: null,
    featuresJson: JSON.stringify([]),
    featuresPtJson: JSON.stringify([]),
    caseProblemEn: null,
    caseProblemPt: null,
    caseWorkEn: null,
    caseWorkPt: null,
    caseResultEn: null,
    caseResultPt: null,
    casePosition: null,
    images: [],
    createdAt: new Date(),
    ...overrides,
  };
}

const image = (position: number, overrides: Record<string, unknown> = {}) => ({
  id: `i${position}`,
  projectId: "p1",
  position,
  path: `/uploads/${position}.webp`,
  captionEn: null,
  captionPt: null,
  ...overrides,
});

beforeEach(() => {
  findMany.mockReset();
  dbState.configured = true;
});

describe("projects-repo — allowlist de esquema no caminho de leitura", () => {
  it.each([
    "javascript:alert(document.domain)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "//evil.example/pwn",
  ])("descarta link %s gravado no banco", async (hostile) => {
    findMany.mockResolvedValue([
      row({ repoUrl: hostile, demoUrl: hostile, caseUrl: hostile }),
    ]);

    const [project] = await getAllProjects("en");

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

    const [project] = await getAllProjects("en");

    expect(project!.links).toEqual({
      repo: "https://github.com/maarkN/maarkn.dev",
      demo: "http://localhost:5050",
      case: "https://example.com/case",
    });
  });
});

describe("projects-repo — ordem curada", () => {
  const item = (slug: string, featured: boolean, year = "2026") => ({ slug, featured, year });

  it("poe destaques primeiro, segue a lista de lib/projects.ts e deixa os do admin no fim", () => {
    const sorted = sortByCuratedOrder([
      item("admin-only-old", false, "2020"),
      item("cloudscraper-js", false, "2025"),
      item("admin-only-new", false, "2027"),
      item("locasty", false, "2021"),
      item("remote-harness", true),
      item("maarkn-dev", false),
    ]);
    expect(sorted.map((p) => p.slug)).toEqual([
      "remote-harness",
      "maarkn-dev",
      "locasty",
      "cloudscraper-js",
      "admin-only-new",
      "admin-only-old",
    ]);
  });
});

describe("projects-repo — idioma e ordem das fontes", () => {
  const stored = {
    slug: "voip-platform",
    tagline: "db tagline",
    taglinePt: "resumo do banco",
    description: "db description",
    descriptionPt: "descrição do banco",
    role: "db role",
    rolePt: "função do banco",
    featuresJson: JSON.stringify(["db feature"]),
    featuresPtJson: JSON.stringify(["entrega do banco"]),
  };

  it("1. o idioma pedido no banco vence o dicionário", async () => {
    findMany.mockResolvedValue([row(stored)]);

    expect(await getProjectBySlug("voip-platform", "en")).toMatchObject({
      tagline: { value: "db tagline", lang: "en" },
      description: { value: "db description", lang: "en" },
      role: { value: "db role", lang: "en" },
      features: { value: ["db feature"], lang: "en" },
    });
    expect(await getProjectBySlug("voip-platform", "pt-BR")).toMatchObject({
      tagline: { value: "resumo do banco", lang: "pt-BR" },
      description: { value: "descrição do banco", lang: "pt-BR" },
      role: { value: "função do banco", lang: "pt-BR" },
      features: { value: ["entrega do banco"], lang: "pt-BR" },
    });
  });

  it("editar o resumo em português não muda o inglês", async () => {
    findMany.mockResolvedValue([row({ ...stored, taglinePt: "resumo editado" })]);

    expect((await getProjectBySlug("voip-platform", "pt-BR"))!.tagline!.value).toBe("resumo editado");
    expect((await getProjectBySlug("voip-platform", "en"))!.tagline!.value).toBe("db tagline");
  });

  it.each([
    [null, "[]"],
    ["", "[]"],
    ["   ", JSON.stringify(["  "])],
  ])("2. sem o idioma pedido (%j), vale o outro idioma do banco, marcado", async (empty, list) => {
    findMany.mockResolvedValue([
      row({ ...stored, tagline: empty, description: empty, role: empty, featuresJson: list }),
    ]);

    expect(await getProjectBySlug("voip-platform", "en")).toMatchObject({
      tagline: { value: "resumo do banco", lang: "pt-BR" },
      description: { value: "descrição do banco", lang: "pt-BR" },
      role: { value: "função do banco", lang: "pt-BR" },
      features: { value: ["entrega do banco"], lang: "pt-BR" },
    });
  });

  it.each([
    ["en", en.projects],
    ["pt-BR", ptBR.projects],
  ] as const)("3. linha sem texto em idioma nenhum cai na semente (%s)", async (lang, dict) => {
    findMany.mockResolvedValue([row({ slug: "voip-platform" })]);

    expect(await getProjectBySlug("voip-platform", lang)).toMatchObject({
      tagline: { value: dict.taglines["voip-platform"], lang },
      description: { value: dict.details["voip-platform"].description, lang },
      role: { value: dict.details["voip-platform"].role, lang },
      features: { value: dict.details["voip-platform"].features, lang },
    });
  });

  it("a queda é por campo: o que está escrito fica, o que falta vem da fonte seguinte", async () => {
    findMany.mockResolvedValue([
      row({ slug: "voip-platform", tagline: "db tagline", rolePt: "função do banco" }),
    ]);

    expect(await getProjectBySlug("voip-platform", "en")).toMatchObject({
      tagline: { value: "db tagline", lang: "en" },
      description: { value: en.projects.details["voip-platform"].description, lang: "en" },
      role: { value: "função do banco", lang: "pt-BR" },
    });
  });

  it("projeto só do banco, sem texto: nenhum campo aparece vazio, aparece ausente", async () => {
    findMany.mockResolvedValue([row({ slug: "created-in-admin" })]);

    expect(await getProjectBySlug("created-in-admin", "en")).toMatchObject({
      tagline: null,
      description: null,
      role: null,
      features: null,
    });
  });
});

describe("projects-repo — sem banco", () => {
  const seeded = (lang: "en" | "pt-BR", dict: typeof en.projects) =>
    seed.map((p) => ({
      slug: p.slug,
      tagline: { value: (dict.taglines as Record<string, string>)[p.slug], lang },
    }));

  it("sem DATABASE_URL, devolve a semente sem tentar consultar", async () => {
    dbState.configured = false;

    expect(await getAllProjects("en")).toMatchObject(seeded("en", en.projects));
    expect(await getAllProjects("pt-BR")).toMatchObject(seeded("pt-BR", ptBR.projects));
    expect(findMany).not.toHaveBeenCalled();
  });

  it("com a leitura falhando no meio da visita, devolve a semente em vez de lançar", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    findMany.mockRejectedValue(new Error("connection terminated"));

    expect(await getAllProjects("pt-BR")).toMatchObject(seeded("pt-BR", ptBR.projects));
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("com a tabela vazia, devolve a semente", async () => {
    findMany.mockResolvedValue([]);
    expect(await getAllProjects("en")).toHaveLength(seed.length);
  });

  it("os destaques e os três casos também vêm da semente", async () => {
    dbState.configured = false;

    expect((await getFeaturedProjects("en")).map((p) => p.slug)).toEqual(
      seed.filter((p) => p.featured).map((p) => p.slug),
    );
    for (const lang of ["en", "pt-BR"] as const) {
      const cases = await getSuccessCases(lang);
      expect(cases.map((c) => [c.successCase.position, c.name])).toEqual([
        [1, "Dermagenix"],
        [2, "DoctorX"],
        [3, "SenseVox"],
      ]);
      for (const { successCase } of cases) {
        for (const part of [successCase.problem, successCase.work, successCase.result]) {
          expect(part?.lang).toBe(lang);
          expect(part?.value).toBeTruthy();
        }
      }
    }
  });
});

describe("projects-repo — casos de sucesso no banco", () => {
  const caseText = {
    caseProblemEn: "problem",
    caseProblemPt: "problema",
    caseWorkEn: "work",
    caseWorkPt: "trabalho",
    caseResultEn: "result",
    caseResultPt: "resultado",
  };

  it("devolve só os marcados, na ordem escolhida e no idioma pedido", async () => {
    findMany.mockResolvedValue([
      row({ id: "a", slug: "a", ...caseText, casePosition: 2 }),
      row({ id: "b", slug: "b", ...caseText }),
      row({ id: "c", slug: "c", ...caseText, casePosition: 1 }),
    ]);

    const cases = await getSuccessCases("pt-BR");
    expect(cases.map((c) => c.slug)).toEqual(["c", "a"]);
    expect(cases[0]!.successCase).toEqual({
      position: 1,
      problem: { value: "problema", lang: "pt-BR" },
      work: { value: "trabalho", lang: "pt-BR" },
      result: { value: "resultado", lang: "pt-BR" },
    });
  });

  it("nenhum marcado é nenhum caso: a semente não volta por baixo da escolha", async () => {
    findMany.mockResolvedValue([row({ slug: "dermatology-ai-platform" })]);
    expect(await getSuccessCases("en")).toEqual([]);
  });
});

describe("projects-repo — galeria", () => {
  it("mantém a ordem do banco e resolve a legenda no idioma da página", async () => {
    findMany.mockResolvedValue([
      row({
        images: [
          image(1, { captionEn: "first", captionPt: "primeira" }),
          image(2, { captionPt: "segunda" }),
          image(3),
        ],
      }),
    ]);

    expect((await getProjectBySlug("demo", "en"))!.gallery).toEqual([
      { url: "/uploads/1.webp", caption: { value: "first", lang: "en" } },
      { url: "/uploads/2.webp", caption: { value: "segunda", lang: "pt-BR" } },
      { url: "/uploads/3.webp", caption: null },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { images: { orderBy: { position: "asc" } } } }),
    );
  });

  it.each([
    "https://evil.example/x.png",
    "//evil.example/x.png",
    "/\\evil.example/x.png",
    "javascript:alert(1)",
    "/uploads/../../etc/passwd",
    "uploads/x.png",
    "",
  ])("descarta o caminho %j, que não é deste site", async (path) => {
    findMany.mockResolvedValue([row({ images: [image(1, { path })] })]);
    expect((await getProjectBySlug("demo", "en"))!.gallery).toEqual([]);
  });
});
