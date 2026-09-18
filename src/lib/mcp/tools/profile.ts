import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { defineMcpTool, jsonResult } from "@/lib/mcp/tool";
import { requireDb } from "@/lib/mcp/tools/_common";

/**
 * Fatos de perfil: ancoras salariais, referencias, regras de enquadramento
 * (R1-R8), skills e a linha do tempo profissional.
 *
 * Duas decisoes de minimizacao, deliberadas e documentadas:
 *
 * 1. **E-mail e telefone de referencias nao saem por aqui.** A tabela e
 *    `private`-only por CHECK no banco justamente porque e PII de terceiros. O
 *    agente recebe nome, relacao, empresa, idioma e se ha contato registrado —
 *    o suficiente para escrever "tenho referencias disponiveis mediante
 *    pedido" sem que um prompt injection consiga extrair o telefone de alguem.
 * 2. **Os pisos salariais saem, mas so com `profile:read`.** Sao exatamente o
 *    que F5 precisa para negociar sem inventar numero — e o motivo de a chave
 *    de leitura publica nunca receber esse escopo.
 */

const SECTIONS = [
  "salary",
  "references",
  "framingRules",
  "skills",
  "experiences",
  "honestyNotes",
] as const;

export const getProfileFacts = defineMcpTool({
  name: "get_profile_facts",
  title: "Ler os fatos de perfil (pretensao, referencias, regras R1-R8)",
  description:
    "Devolve os fatos estaveis do perfil: ancoras salariais por mercado/rota (alvo e PISO), referencias profissionais, as regras invioláveis de enquadramento R1-R8 (com os padroes proibidos, para voce se auto-verificar ANTES de escrever), skills com o anchorRank (R6: TypeScript/Node lidera, Go nunca e ancora) e a linha do tempo profissional. " +
    "Use isto em vez de inferir: numero salarial, data e metrica NUNCA saem do modelo — saem daqui. Quando um fato nao existe aqui, escreva '_(a preencher)_'. " +
    "E-mail e telefone de referencias nao sao devolvidos por esta porta, por minimizacao de PII de terceiros.",
  scopes: ["profile:read"],
  inputSchema: {
    include: z
      .array(z.enum(SECTIONS))
      .max(SECTIONS.length)
      .optional()
      .describe("Secoes desejadas. Omitido = todas."),
    market: z
      .string()
      .max(40)
      .optional()
      .describe("Filtra as ancoras salariais por mercado (ex.: 'CA', 'IE', 'DE', 'US-remote', 'B2B')."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  async handler(args) {
    requireDb();
    const wanted = new Set<(typeof SECTIONS)[number]>(args.include ?? SECTIONS);
    const out: Record<string, unknown> = {};

    if (wanted.has("salary")) {
      const rows = await db.salaryExpectation.findMany({
        where: args.market
          ? { market: { equals: args.market, mode: "insensitive" } }
          : undefined,
        orderBy: [{ market: "asc" }, { key: "asc" }],
        take: 100,
      });
      out.ancorasSalariais = rows.map((row) => ({
        key: row.key,
        market: row.market,
        currency: row.currency,
        unit: row.unit,
        contractType: row.contractType,
        target: row.target,
        floor: row.floor,
        note: row.note,
        effectiveFrom: row.effectiveFrom ? row.effectiveFrom.toISOString() : null,
      }));
      out.avisoSalarial =
        "Use exatamente estes numeros. Se o mercado pedido nao estiver na lista, diga que a pretensao " +
        "sera confirmada — nao interpole, nao converta moeda e nao arredonde.";
    }

    if (wanted.has("references")) {
      const rows = await db.professionalReference.findMany({
        orderBy: { name: "asc" },
        take: 100,
      });
      out.referencias = rows.map((row) => ({
        slug: row.slug,
        name: row.name,
        relationship: row.relationship,
        companyName: row.companyName,
        roleTitle: row.roleTitle,
        language: row.language,
        canContact: row.canContact,
        temEmail: Boolean(row.email),
        temTelefone: Boolean(row.phone),
        noteMd: row.noteMd,
      }));
    }

    if (wanted.has("framingRules")) {
      const rows = await db.framingRule.findMany({
        where: { active: true },
        orderBy: { code: "asc" },
        take: 100,
      });
      out.regrasDeEnquadramento = rows.map((row) => ({
        code: row.code,
        title: row.title,
        ruleMd: row.ruleMd,
        severity: row.severity,
        scope: row.scope,
        forbiddenPatterns: row.forbiddenPatterns,
        canonicalText: row.canonicalText,
      }));
      out.avisoRegras =
        "Regras 'blocking' nao sao sugestao: um texto que viole qualquer uma e REJEITADO pelo validador " +
        "deterministico do servidor, nao apenas sinalizado.";
    }

    if (wanted.has("skills")) {
      const rows = await db.skill.findMany({
        orderBy: [{ anchorRank: "asc" }, { name: "asc" }],
        take: 300,
        select: {
          slug: true,
          name: true,
          category: true,
          level: true,
          yearsUsed: true,
          lastUsedYear: true,
          isPrimary: true,
          anchorRank: true,
        },
      });
      out.skills = rows;
    }

    if (wanted.has("experiences")) {
      const rows = await db.experience.findMany({
        orderBy: [{ orderIndex: "asc" }, { startDate: "desc" }],
        take: 100,
        select: {
          slug: true,
          publicName: true,
          roleTitle: true,
          roleTitleEn: true,
          employmentType: true,
          startDate: true,
          endDate: true,
          current: true,
          locationText: true,
          market: true,
          summaryPt: true,
          summaryEn: true,
        },
      });
      out.experiencias = rows.map((row) => ({
        ...row,
        startDate: row.startDate ? row.startDate.toISOString().slice(0, 10) : null,
        endDate: row.endDate ? row.endDate.toISOString().slice(0, 10) : null,
      }));
    }

    if (wanted.has("honestyNotes")) {
      const rows = await db.honestyNote.findMany({
        where: { applicationId: null },
        orderBy: { ruleCode: "asc" },
        take: 200,
        select: { sourceKey: true, ruleCode: true, scope: true, severity: true, noteMd: true },
      });
      out.avisosDeHonestidade = rows;
    }

    return jsonResult(out);
  },
});
