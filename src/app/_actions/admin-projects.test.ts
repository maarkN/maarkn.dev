import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`);
  },
}));

const auth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth }));

const project = { findMany: vi.fn(), create: vi.fn(), update: vi.fn() };
vi.mock("@/lib/db", () => ({ db: { project }, dbConfigured: true }));

const { saveProject } = await import("./admin-projects");
const { projects } = await import("@/lib/projects");
const { seedText } = await import("@/lib/project-text");

const CASE_TEXT = {
  caseProblemPt: "problema",
  caseProblemEn: "problem",
  caseWorkPt: "trabalho",
  caseWorkEn: "work",
  caseResultPt: "resultado",
  caseResultEn: "result",
};

function form(fields: Record<string, string> = {}): FormData {
  const data = new FormData();
  const all = {
    slug: "demo",
    name: "Demo",
    year: "2026",
    category: "web",
    status: "live",
    featured: "off",
    monogram: "DM",
    accentFrom: "#4f6ef7",
    accentTo: "#22d3ee",
    stack: "Go, TypeScript",
    sourceVisibility: "public",
    ...fields,
  };
  for (const [name, value] of Object.entries(all)) data.set(name, value);
  return data;
}

/** The data of the row the action wrote. */
function written() {
  const call = project.update.mock.calls[0] ?? project.create.mock.calls[0];
  return call![0].data as Record<string, unknown>;
}

beforeEach(() => {
  vi.resetAllMocks();
  auth.mockResolvedValue({ user: { email: "admin@example.com" } });
  project.findMany.mockResolvedValue([]);
  project.create.mockResolvedValue({ id: "new", slug: "demo" });
  project.update.mockResolvedValue({ id: "p1", slug: "demo" });
});

describe("saveProject — texto nos dois idiomas", () => {
  it("exige sessão antes de qualquer coisa", async () => {
    auth.mockResolvedValue(null);
    await expect(saveProject(null, form())).rejects.toThrow("redirect:/admin/login");
    expect(project.create).not.toHaveBeenCalled();
  });

  it("grava cada idioma na sua coluna", async () => {
    const result = await saveProject(
      "p1",
      form({
        tagline: "summary",
        taglinePt: "resumo",
        description: "description",
        descriptionPt: "descrição",
        role: "role",
        rolePt: "função",
        features: "one\ntwo",
        featuresPt: "um\ndois",
      }),
    );

    expect(result.ok).toBe(true);
    expect(written()).toMatchObject({
      tagline: "summary",
      taglinePt: "resumo",
      description: "description",
      descriptionPt: "descrição",
      role: "role",
      rolePt: "função",
      featuresJson: '["one","two"]',
      featuresPtJson: '["um","dois"]',
    });
  });

  it("não parte uma entrega nas vírgulas dela", async () => {
    const line = "Asterisk over ARI, AMI and AGI, with call events queued";
    await saveProject("p1", form({ features: line, featuresPt: line, stack: "Go, TypeScript" }));
    expect(written()).toMatchObject({
      featuresJson: JSON.stringify([line]),
      featuresPtJson: JSON.stringify([line]),
      stackJson: '["Go","TypeScript"]',
    });
  });

  it.each(projects)("abrir e salvar $slug devolve o mesmo texto", async (p) => {
    const text = seedText(p.slug);
    const result = await saveProject(
      "p1",
      form({
        slug: p.slug,
        tagline: text.en.tagline!,
        taglinePt: text["pt-BR"].tagline!,
        description: text.en.description!,
        descriptionPt: text["pt-BR"].description!,
        role: text.en.role!,
        rolePt: text["pt-BR"].role!,
        features: text.en.features.join("\n"),
        featuresPt: text["pt-BR"].features.join("\n"),
      }),
    );

    expect(result).toMatchObject({ ok: true });
    expect(written()).toMatchObject({
      tagline: text.en.tagline,
      taglinePt: text["pt-BR"].tagline,
      description: text.en.description,
      descriptionPt: text["pt-BR"].description,
      role: text.en.role,
      rolePt: text["pt-BR"].role,
      featuresJson: JSON.stringify(text.en.features),
      featuresPtJson: JSON.stringify(text["pt-BR"].features),
    });
  });

  it("revalida a home dos dois idiomas e o sitemap", async () => {
    await saveProject("p1", form());
    const paths = revalidatePath.mock.calls.map(([path]) => path);
    expect(paths).toEqual(expect.arrayContaining(["/en", "/pt-BR", "/sitemap.xml"]));
  });
});

describe("saveProject — casos de sucesso", () => {
  const three = [
    { name: "Dermagenix", casePosition: 1 },
    { name: "DoctorX", casePosition: 2 },
    { name: "SenseVox", casePosition: 3 },
  ];

  it("marca um caso completo em uma posição livre", async () => {
    project.findMany.mockResolvedValue(three.slice(0, 2));
    const result = await saveProject("p1", form({ ...CASE_TEXT, casePosition: "3" }));
    expect(result).toMatchObject({ ok: true });
    expect(written()).toMatchObject({ ...CASE_TEXT, casePosition: 3 });
  });

  it("recusa o quarto e diz que é preciso desmarcar um", async () => {
    project.findMany.mockResolvedValue(three);
    const result = await saveProject("p1", form({ ...CASE_TEXT, casePosition: "1" }));
    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.message).toContain("Dermagenix, DoctorX, SenseVox");
    expect(result.message).toContain("Desmarque um");
    expect(result.fieldErrors).toHaveProperty("casePosition");
    expect(project.update).not.toHaveBeenCalled();
  });

  it("recusa a posição de outro projeto dizendo de quem é", async () => {
    project.findMany.mockResolvedValue(three.slice(0, 2));
    const result = await saveProject("p1", form({ ...CASE_TEXT, casePosition: "2" }));
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.message).toContain("DoctorX");
    expect(project.update).not.toHaveBeenCalled();
  });

  it("não conta o próprio projeto entre os outros", async () => {
    await saveProject("p1", form({ ...CASE_TEXT, casePosition: "1" }));
    expect(project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { casePosition: { not: null }, id: { not: "p1" } } }),
    );
  });

  it("recusa um caso sem texto indicando o que falta", async () => {
    const result = await saveProject(
      "p1",
      form({ ...CASE_TEXT, caseWorkEn: "", caseResultPt: "   ", casePosition: "1" }),
    );
    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.message).toBe("Para ser caso de sucesso, falta: trabalho (EN), resultado (PT).");
    expect(Object.keys(result.fieldErrors!).sort()).toEqual(
      ["casePosition", "caseResultPt", "caseWorkEn"].sort(),
    );
    expect(project.update).not.toHaveBeenCalled();
  });

  it("guarda o texto do caso sem marcá-lo, mesmo incompleto", async () => {
    const result = await saveProject("p1", form({ caseProblemPt: "problema", casePosition: "none" }));
    expect(result).toMatchObject({ ok: true });
    expect(written()).toMatchObject({ caseProblemPt: "problema", casePosition: null });
  });

  it.each(["4", "0", "-1", "1.5", "x"])("recusa a posição %s", async (casePosition) => {
    const result = await saveProject("p1", form({ ...CASE_TEXT, casePosition }));
    expect(result).toMatchObject({ ok: false, fieldErrors: { casePosition: expect.any(String) } });
    expect(project.update).not.toHaveBeenCalled();
  });

  it("perdeu a corrida pela posição: o banco recusa e a mensagem explica", async () => {
    project.update.mockRejectedValue({ code: "P2002", meta: { target: ["casePosition"] } });
    const result = await saveProject("p1", form({ ...CASE_TEXT, casePosition: "1" }));
    expect(result).toMatchObject({ ok: false, fieldErrors: { casePosition: expect.any(String) } });
  });
});
