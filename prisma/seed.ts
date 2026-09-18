import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { projects as STATIC_PROJECTS } from "../src/lib/projects";
import { encodeStringList } from "../src/lib/json-list";
import { buildFolderName, slugPart } from "../src/lib/applications";

const db = new PrismaClient();

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@maarkn.dev").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.warn(
      "[seed] ADMIN_PASSWORD is not set — skipping admin user creation. " +
        "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local before running the seed if you want to log in."
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, role: "admin" },
    create: { email, passwordHash, role: "admin", name: "Marco Filho" },
  });
  console.log(`[seed] admin user ready: ${user.email}`);
}

async function seedProjects() {
  // Idempotent: only insert when no projects exist yet, so re-running the seed
  // doesn't clobber edits the operator made through the admin UI.
  const existing = await db.project.count();
  if (existing > 0) {
    console.log(`[seed] projects already populated (${existing}) — skipping.`);
    return;
  }

  for (const p of STATIC_PROJECTS) {
    await db.project.create({
      data: {
        slug: p.slug,
        name: p.name,
        year: p.year,
        category: p.category,
        status: p.status,
        featured: p.featured,
        monogram: p.monogram,
        accentFrom: p.accent.from,
        accentTo: p.accent.to,
        stackJson: encodeStringList(p.stack),
        sourceVisibility: p.sourceVisibility ?? "public",
        repoUrl: p.sourceVisibility === "private" ? null : p.links?.repo ?? null,
        demoUrl: p.links?.demo ?? null,
        caseUrl: p.links?.case ?? null,
        featuresJson: encodeStringList([]),
      },
    });
  }
  console.log(`[seed] inserted ${STATIC_PROJECTS.length} projects.`);
}

const SALARY: Record<string, string> = {
  IE: "Base ≥ €68.911 (Critical Skills) - mire €90-130k",
  DE: "Blue Card ≥ €46k - mire €80-110k",
  NL: "HSM ≥ €71.3k/ano (€5.942/mês) - mire €80-120k +30% ruling",
};

// [country, company, city, fit, careersUrl, notes?] — mirrors the CSV tracker.
const APPLICATIONS: [string, string, string, string, string, string?][] = [
  ["IE", "Stripe", "Dublin", "⭐", "https://stripe.com/jobs"],
  ["IE", "Datadog", "Dublin", "⭐ Go", "https://careers.datadoghq.com"],
  ["IE", "Intercom", "Dublin", "⭐ IA/Fin", "https://www.intercom.com/careers"],
  ["IE", "Databricks", "Dublin", "⭐ IA", "https://www.databricks.com/company/careers"],
  ["IE", "Genesys", "Galway", "⭐ IA/ML", "https://www.genesys.com/company/careers"],
  ["IE", "Tines", "Dublin", "⭐ IA", "https://www.tines.com/careers", "confirmar se a vaga paga ≥€68.9k"],
  ["IE", "Google", "Dublin", "Bom", "https://careers.google.com"],
  ["IE", "Meta", "Dublin", "Bom", "https://www.metacareers.com"],
  ["IE", "Microsoft", "Dublin", "Bom", "https://careers.microsoft.com"],
  ["IE", "Amazon-AWS", "Dublin", "Bom", "https://www.amazon.jobs"],
  ["IE", "Workday", "Dublin", "Bom", "https://www.workday.com/en-us/company/careers.html"],
  ["IE", "HubSpot", "Dublin", "Bom", "https://www.hubspot.com/careers"],
  ["IE", "Apple", "Cork", "Bom", "https://jobs.apple.com/en-ie/search?location=ireland-IRL"],
  ["IE", "LinkedIn", "Dublin", "Bom", "https://careers.linkedin.com"],
  ["IE", "Mastercard", "Dublin", "Bom", "https://careers.mastercard.com"],
  ["IE", "Workhuman", "Dublin", "Bom", "https://www.workhuman.com/careers", "confirmar se paga ≥€68.9k"],
  ["DE", "Zalando", "Berlim", "⭐", "https://jobs.zalando.com"],
  ["DE", "Delivery Hero", "Berlim", "⭐", "https://careers.deliveryhero.com"],
  ["DE", "Forto", "Berlim", "⭐ Node/Go", "https://forto.com/en/career"],
  ["DE", "Contentful", "Berlim", "⭐ Node/TS", "https://www.contentful.com/careers"],
  ["DE", "DeepL", "Colônia-Berlim", "⭐ IA", "https://jobs.deepl.com"],
  ["DE", "Aleph Alpha", "Heidelberg", "⭐ IA", "https://jobs.ashbyhq.com/AlephAlpha"],
  ["DE", "Parloa", "Berlim", "⭐ Go/TS+LLM", "https://parloa.com/careers"],
  ["DE", "Celonis", "Munique", "⭐ IA", "https://www.celonis.com/careers"],
  ["DE", "Datadog", "Berlim", "⭐ Go", "https://careers.datadoghq.com"],
  ["DE", "N26", "Berlim", "Bom", "https://n26.com/en/careers"],
  ["DE", "Trade Republic", "Berlim", "Bom", "https://traderepublic.com/en/careers"],
  ["DE", "HelloFresh", "Berlim", "Bom", "https://careers.hellofresh.com"],
  ["DE", "GetYourGuide", "Berlim", "Bom", "https://careers.getyourguide.com"],
  ["DE", "Solaris", "Berlim", "Bom", "https://www.solarisgroup.com/en/careers"],
  ["DE", "SAP", "Walldorf-Berlim", "Bom", "https://jobs.sap.com"],
  ["DE", "Personio", "Munique", "Bom", "https://www.personio.com/careers"],
  ["NL", "Uber", "Amsterdã", "⭐ Go", "https://www.uber.com/careers"],
  ["NL", "Databricks", "Amsterdã", "⭐ IA", "https://www.databricks.com/company/careers"],
  ["NL", "DataSnipper", "Amsterdã", "⭐ IA/LLM", "https://careers.datasnipper.com"],
  ["NL", "Adyen", "Amsterdã", "⭐", "https://www.adyen.com/careers"],
  ["NL", "Booking.com", "Amsterdã", "⭐", "https://careers.booking.com"],
  ["NL", "Miro", "Amsterdã", "⭐", "https://miro.com/careers"],
  ["NL", "Mollie", "Amsterdã", "⭐", "https://jobs.mollie.com"],
  ["NL", "Just Eat Takeaway", "Amsterdã", "⭐", "https://careers.justeattakeaway.com"],
  ["NL", "Elastic", "Amsterdã", "⭐ Go", "https://www.elastic.co/careers"],
  ["NL", "Catawiki", "Amsterdã", "⭐", "https://catawiki.careers"],
  ["NL", "bunq", "Amsterdã", "Bom", "https://careers.bunq.com"],
  ["NL", "Backbase", "Amsterdã", "Bom", "https://www.backbase.com/careers"],
  ["NL", "ING", "Amsterdã", "Bom", "https://www.ing.jobs"],
  ["NL", "Philips", "Eindhoven", "Bom", "https://www.careers.philips.com"],
  ["NL", "ASML", "Eindhoven", "Bom", "https://www.asml.com/careers"],
  ["NL", "TomTom", "Amsterdã", "Bom", "https://www.tomtom.com/careers"],
];

/**
 * Alvos iniciais do tracker, agora no modelo NORMALIZADO
 * (`Company` + `Job` + `Application`). O model plano `JobApplication` foi
 * dropado no F2a; a migration `20260816170000_application_cutover` converteu as
 * linhas que ja estavam no banco.
 *
 * A idempotencia mudou de forma: antes era `count() > 0` no inicio (reimportar
 * duplicava tudo se a tabela estivesse parcialmente preenchida). Agora e por
 * CHAVE NATURAL, linha a linha — e as chaves sao calculadas com as MESMAS
 * regras da migration e das telas (`slugPart`/`buildFolderName`), de forma que
 * rodar o seed depois do cutover reencontra as linhas migradas em vez de criar
 * um segundo conjunto. Se voce mudar a regra de slug em um lugar, mude nos
 * tres.
 */
async function seedApplications() {
  let companies = 0;
  let jobs = 0;
  let applications = 0;

  for (const [country, company, city, fit, careersUrl, notes] of APPLICATIONS) {
    const companyFolder = slugPart(company);
    const companyRow = await db.company.upsert({
      where: { folderName: companyFolder },
      // `update: {}` de proposito: o seed nunca sobrescreve o que ja esta la —
      // o MCP (vault) e fonte melhor que esta lista estatica.
      update: {},
      create: {
        folderName: companyFolder,
        name: company,
        careersUrl,
        country,
        city,
        market: country,
        lastMcpTool: "seed",
        lastSeenAt: new Date(),
      },
      select: { id: true, createdAt: true, updatedAt: true },
    });
    if (companyRow.createdAt.getTime() === companyRow.updatedAt.getTime()) {
      companies += 1;
    }

    // Chave natural da vaga: a pagina de carreiras serve varias vagas, entao a
    // URL crua nao e chave — o fragmento do mercado desambigua (Datadog IE vs
    // Datadog DE), exatamente como na migration.
    const sourceUrl = `${careersUrl}#${slugPart(country)}`;
    const jobRow = await db.job.upsert({
      where: { sourceUrl },
      update: {},
      create: {
        sourceUrl,
        companyId: companyRow.id,
        title: "Cargo a definir",
        market: country,
        locationText: [city, country].filter(Boolean).join(", "),
        // A lista veio da varredura de empresas que patrocinam visto — este e
        // o unico valor afirmado pela fonte. Vaga remota B2B entra pelo vault.
        sponsorship: "explicit_support",
        salaryText: SALARY[country] ?? null,
        lastMcpTool: "seed",
        lastSeenAt: new Date(),
      },
      select: { id: true },
    });
    jobs += 1;

    const folderName = buildFolderName({ company, market: country });
    const existing = await db.application.findUnique({
      where: { folderName },
      select: { id: true },
    });
    if (existing) continue;

    await db.application.create({
      data: {
        folderName,
        companyId: companyRow.id,
        jobId: jobRow.id,
        stage: "radar",
        market: country,
        source: "company_site",
        fit,
        targetSalary: SALARY[country] ?? null,
        notesMd: notes ?? null,
        lastMcpTool: "seed",
        lastSeenAt: new Date(),
      },
    });
    applications += 1;
  }

  console.log(
    `[seed] applications: ${applications} nova(s), ${companies} empresa(s) nova(s), ${jobs} vaga(s) garantida(s).`
  );
}

/// Regras invioláveis de enquadramento (R1–R8). São critério de REJEIÇÃO do
/// gerador de F4, não sugestão — por isso viram dado, não prompt. O texto é
/// transcrito da seção 2 do briefing; `forbiddenPatterns` é o gancho do
/// validador determinístico. Nada aqui é inventado: quando um dado não é
/// confirmado, o vault escreve `_(a preencher)_` e nós mantemos assim.
const FRAMING_RULES: {
  code: string;
  title: string;
  ruleMd: string;
  scope: string;
  forbiddenPatterns: string[];
  canonicalText?: string;
}[] = [
  {
    code: "R1",
    title: '"6+ anos", nunca "7+"',
    ruleMd:
      'Sempre "6+ anos" de experiência. Nunca "7+". Já houve correção manual por divergência entre CV, LinkedIn e VanHack.',
    scope: "all",
    // O erro documentado nao aparece so como "7+": ja houve "7 years" liso no
    // LinkedIn/VanHack. O padrao anterior ("7\\+\\s*(anos|years)") deixava
    // passar "7 years", "7 yrs" e "over 7 years" — falso negativo justamente
    // na regra que ja causou correcao manual.
    forbiddenPatterns: [
      "\\b7\\s*\\+?\\s*(anos|years|yrs)\\b",
      "\\bseven\\s*\\+?\\s*(years|yrs)\\b",
    ],
    canonicalText: "6+ years",
  },
  {
    code: "R2",
    title: 'Nunca "degree". Nunca "incompleto"',
    ruleMd:
      "Formação se escreve exatamente: `Computer Systems Analysis (Technologist programme) — Faculdade SENAI Fatesg, 2018–2020`.",
    scope: "all",
    forbiddenPatterns: ["\\bdegree\\b", "\\bincompleto\\b", "\\bincomplete\\b"],
    canonicalText:
      "Computer Systems Analysis (Technologist programme) — Faculdade SENAI Fatesg, 2018–2020",
  },
  {
    code: "R3",
    title: 'cloudscraper.js é "wrapper", nunca "port"',
    ruleMd:
      'Ao citar o cloudscraper.js, use "wrapper". A palavra "port" é proibida nesse contexto.',
    scope: "all",
    // O separador `[^.]` era fatal: o proprio nome do projeto tem um ponto
    // ("cloudscraper.js"), entao a regra NUNCA casava com a frase que ela
    // existe para barrar ("cloudscraper.js, a Node port of ..."). Delimitado
    // por linha, e cobrindo port/ported/porting.
    forbiddenPatterns: [
      "cloudscraper[^\\n]{0,80}\\bport(ed|ing)?\\b",
      "\\bport(ed|ing)?\\b[^\\n]{0,80}cloudscraper",
    ],
  },
  {
    code: "R4",
    title: "A ponte Super Real Estate → Imobitech não pode ser afirmada",
    ruleMd:
      "Venda ainda em formalização. O arquivo `00 - Repositórios/Repositórios para fazer analise da minha experiência.md` mostra a ponte sem o aviso ⚠️: está incompleto e é enganoso — não use como fonte.",
    scope: "all",
    forbiddenPatterns: ["Super Real Estate[^.]{0,120}Imobitech", "Imobitech[^.]{0,120}Super Real Estate"],
  },
  {
    code: "R5",
    title: "Nenhuma métrica inventada ou arredondada para cima",
    ruleMd:
      "`_(a preencher)_` significa 'não confirmado' — jamais substitua por número plausível. Métrica marcada como projeção de PRD não é benchmark medido. Toda métrica precisa estar na evidência recuperada.",
    scope: "all",
    forbiddenPatterns: [],
  },
  {
    code: "R6",
    title: "TypeScript/Node lidera sempre; Go é segunda linguagem",
    ruleMd:
      "Go nunca é âncora, mesmo sustentando os feitos mais impressionantes (41 bounded contexts, backoffice de ~23,4k LOC em uma semana, cloudscraper-go). Decisão registrada: Go é mais raso que TS. Codificado em `Skill.anchorRank` (TS/Node = 1).",
    scope: "resume",
    forbiddenPatterns: [],
  },
  {
    code: "R7",
    title: "VendorHub Sistemas não recebe métricas",
    ruleMd:
      "Sem dossiê; empresa com registro suspenso em out/2023. Cite o vínculo sem número.",
    scope: "all",
    // "VendorHub[^.]{0,120}\\d" barrava tambem as DATAS do vinculo
    // ("VendorHub Sistemas — 2021–2023"), que sao obrigatorias no CV: a regra
    // e blocking, entao o falso positivo reprovaria todo CV honesto. Restringe
    // a numeros com forma de METRICA.
    forbiddenPatterns: [
      "VendorHub[^.]{0,120}\\b\\d+(?:[.,]\\d+)?\\s*(%|k\\b|mil\\b|million\\b|LOC\\b|commits?\\b|usu[aá]rios?\\b|users?\\b|clientes?\\b|x\\b)",
    ],
  },
  {
    code: "R8",
    title: "Data do facematch Python da DataSíntese está em disputa",
    ruleMd:
      "Informado out/2023→mar/2024, mas o `requirements.txt` fixa pacotes de 2025. Não use essa data em CV até resolver.",
    scope: "resume",
    forbiddenPatterns: [],
  },
];

async function seedFramingRules() {
  // Idempotente e não-destrutivo: só insere o que ainda não existe, para não
  // clobberar edições feitas pelo humano na UI do admin.
  let inserted = 0;
  for (const rule of FRAMING_RULES) {
    const existing = await db.framingRule.findUnique({ where: { code: rule.code } });
    if (existing) continue;
    await db.framingRule.create({
      data: {
        code: rule.code,
        title: rule.title,
        ruleMd: rule.ruleMd,
        scope: rule.scope,
        severity: "blocking",
        forbiddenPatterns: rule.forbiddenPatterns,
        canonicalText: rule.canonicalText ?? null,
        sourcePath: "briefing/regras-invioláveis-de-conteúdo",
      },
    });
    inserted++;
  }
  console.log(
    inserted > 0
      ? `[seed] inserted ${inserted} framing rules (R1–R8).`
      : "[seed] framing rules already populated — skipping."
  );
}

async function main() {
  await seedAdmin();
  await seedProjects();
  await seedApplications();
  await seedFramingRules();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
