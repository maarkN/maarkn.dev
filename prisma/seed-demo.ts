/**
 * Fixtures de DEMONSTRACAO do painel de candidaturas (F2a).
 *
 * Por que isto existe: a sincronizacao real do vault (a skill do Obsidian ->
 * MCP) ainda nao rodou, entao o banco de desenvolvimento tem apenas os alvos do
 * tracker antigo — 74 linhas quase identicas, todas em `radar`, todas sem
 * documento, evento, contato ou cobertura de requisito. Um painel verificado
 * so contra esse conjunto passa em falso: paginacao, filtro por estagio, funil,
 * heranca de `sponsorship` e as duas rotas nunca chegam a ser exercitados.
 *
 * REGRAS DESTE ARQUIVO — leia antes de mexer:
 *
 *   1. **Os dados sao SINTETICOS.** Empresas ficticias, pessoas ficticias,
 *      URLs `demo://`. Nada aqui foi lido do vault do usuario, e nada aqui deve
 *      ser lido do vault: este script nao abre arquivo nenhum. Cargos e
 *      mercados sao reais porque precisam ser plausiveis; o resto e inventado.
 *   2. **Tudo nasce `private`** (default do schema, reafirmado nas escritas),
 *      como tudo que entra pelo MCP. Fixture nao pode aparecer no chat publico.
 *   3. **Tudo e marcado.** Cada linha criada aqui carrega
 *      `lastSyncRunId = DEMO_RUN_ID` e `sourcePath` comecando com `demo/`.
 *      E o que torna `--reset` cirurgico: nenhuma linha real (migrada,
 *      semeada pelo `db:seed` ou escrita pelo MCP) e tocada.
 *   4. **Determinismo.** PRNG com semente fixa e data-base fixa: rodar duas
 *      vezes produz exatamente o mesmo conjunto. Sem isso, "o painel mudou" e
 *      indistinguivel de "o seed sorteou outra coisa".
 *
 * Uso:
 *   pnpm db:seed:demo            # apaga as fixtures antigas e recria
 *   pnpm db:seed:demo --reset    # so apaga
 *
 * Lembre: o Prisma CLI nao le `.env.local`. Antes de rodar:
 *   export $(grep '^DATABASE_URL=' .env.local | xargs)
 */

import { PrismaClient, type FunnelStage, type SponsorshipSignal } from "@prisma/client";
import { FUNNEL_STAGES, slugPart } from "../src/lib/applications";

const db = new PrismaClient();

/**
 * Id FIXO da rodada de sincronizacao das fixtures. Precisa ser constante (e nao
 * um cuid novo a cada execucao) porque e a etiqueta pela qual `--reset` acha o
 * que apagar — uma etiqueta que muda a cada rodada nao etiqueta nada.
 */
const DEMO_RUN_ID = "demo-fixtures";
const DEMO_PREFIX = "demo/";

/** Data-base fixa: as datas relativas do funil ficam estaveis entre execucoes. */
const BASE = new Date("2026-08-16T12:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(BASE.getTime() - days * 24 * 60 * 60 * 1000);
}

/** PRNG deterministico (mulberry32). Semente fixa = fixture reproduzivel. */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return function rng(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20260816);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function int(min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// ---------------------------------------------------------------------------
// vocabulario sintetico
// ---------------------------------------------------------------------------

type Market = "CA" | "IE" | "DE" | "EU-remoto" | "BR-B2B";

/** 40 empresas ficticias. Nenhuma delas existe; qualquer coincidencia e ruido. */
const COMPANIES: { name: string; market: Market; city: string; industry: string }[] = [
  { name: "Northwind Ledger", market: "CA", city: "Toronto, ON", industry: "Fintech" },
  { name: "Maple Signals", market: "CA", city: "Toronto, ON", industry: "Dados" },
  { name: "Cedarline Health", market: "CA", city: "Vancouver, BC", industry: "Health tech" },
  { name: "Aurora Freight", market: "CA", city: "Calgary, AB", industry: "Logística" },
  { name: "Kanata Robotics", market: "CA", city: "Ottawa, ON", industry: "Robótica" },
  { name: "Beluga Payments", market: "CA", city: "Montréal, QC", industry: "Pagamentos" },
  { name: "Foothills Analytics", market: "CA", city: "Calgary, AB", industry: "Analytics" },
  { name: "Rideau Learning", market: "CA", city: "Ottawa, ON", industry: "Edtech" },
  { name: "Klondike Grid", market: "CA", city: "Vancouver, BC", industry: "Energia" },
  { name: "Bluenose Logistics", market: "CA", city: "Halifax, NS", industry: "Logística" },
  { name: "Prairie Bloom Agtech", market: "CA", city: "Winnipeg, MB", industry: "Agtech" },
  { name: "St. Lawrence Media", market: "CA", city: "Montréal, QC", industry: "Mídia" },
  { name: "Liffey Payments", market: "IE", city: "Dublin", industry: "Pagamentos" },
  { name: "Shannon Data", market: "IE", city: "Limerick", industry: "Dados" },
  { name: "Claddagh Insurance", market: "IE", city: "Galway", industry: "Insurtech" },
  { name: "Blarney Cloud", market: "IE", city: "Cork", industry: "Cloud" },
  { name: "Dolmen Security", market: "IE", city: "Dublin", industry: "Segurança" },
  { name: "Grafton Retail Tech", market: "IE", city: "Dublin", industry: "Varejo" },
  { name: "Boyne Biotech", market: "IE", city: "Drogheda", industry: "Biotech" },
  { name: "Skellig Networks", market: "IE", city: "Tralee", industry: "Telecom" },
  { name: "Rheinwerk Mobility", market: "DE", city: "Köln", industry: "Mobilidade" },
  { name: "Spreelicht Energy", market: "DE", city: "Berlim", industry: "Energia" },
  { name: "Alpenblick Fintech", market: "DE", city: "Munique", industry: "Fintech" },
  { name: "Werkstatt Analytics", market: "DE", city: "Hamburgo", industry: "Analytics" },
  { name: "Nordstern Logistik", market: "DE", city: "Bremen", industry: "Logística" },
  { name: "Havelfunk Media", market: "DE", city: "Potsdam", industry: "Mídia" },
  { name: "Schwarzwald Robotics", market: "DE", city: "Stuttgart", industry: "Robótica" },
  { name: "Zollhaus Payments", market: "DE", city: "Frankfurt", industry: "Pagamentos" },
  { name: "Orbita Labs", market: "EU-remoto", city: "Remoto (UE)", industry: "SaaS" },
  { name: "Ravenstack", market: "EU-remoto", city: "Remoto (UE)", industry: "DevTools" },
  { name: "Northloop Systems", market: "EU-remoto", city: "Remoto (UE)", industry: "Infra" },
  { name: "Quaystone", market: "EU-remoto", city: "Remoto (UE)", industry: "Fintech" },
  { name: "Ember & Iron", market: "EU-remoto", city: "Remoto (UE)", industry: "Marketplace" },
  { name: "Tidewater Cloud", market: "EU-remoto", city: "Remoto (UE)", industry: "Cloud" },
  { name: "Serrano Digital", market: "BR-B2B", city: "São Paulo, SP", industry: "Consultoria" },
  { name: "Pindorama Labs", market: "BR-B2B", city: "Remoto (BR)", industry: "Produto" },
  { name: "Vento Sul Tecnologia", market: "BR-B2B", city: "Florianópolis, SC", industry: "SaaS" },
  { name: "Caravela Software", market: "BR-B2B", city: "Remoto (BR)", industry: "Consultoria" },
  { name: "Jangada Systems", market: "BR-B2B", city: "Recife, PE", industry: "Logística" },
  { name: "Ipê Data", market: "BR-B2B", city: "Goiânia, GO", industry: "Dados" },
];

/**
 * Ordem de uso das empresas: round-robin entre os mercados, nao a ordem da
 * lista. Percorrer o array cru daria as 35 candidaturas todas em CA/IE/DE (os
 * 28 primeiros itens) e deixaria a ROTA REMOTA — o foco atual — com meia duzia
 * de linhas. O painel precisa das duas rotas com massa parecida, senao o filtro
 * de rota parece funcionar so porque um dos lados esta quase vazio.
 */
const COMPANY_ROTATION: typeof COMPANIES = (() => {
  const byMarket = new Map<Market, typeof COMPANIES>();
  for (const company of COMPANIES) {
    const list = byMarket.get(company.market) ?? [];
    list.push(company);
    byMarket.set(company.market, list);
  }
  const buckets = [...byMarket.values()];
  const rotation: typeof COMPANIES = [];
  for (let i = 0; rotation.length < COMPANIES.length; i += 1) {
    for (const bucket of buckets) {
      if (bucket[i]) rotation.push(bucket[i]);
    }
  }
  return rotation;
})();

/** Cargos reais de mercado — o que aparece de fato nas vagas alvo. */
const ROLES = [
  "Senior Backend Engineer (Node.js/TypeScript)",
  "Senior Software Engineer, Platform",
  "Staff Backend Engineer",
  "Full Stack Developer (React/Node)",
  "Backend Engineer, Payments",
  "Senior Go Engineer",
  "Software Engineer II (TypeScript)",
  "Lead Backend Engineer",
  "Senior Platform Engineer (Kubernetes)",
  "Backend Engineer (AI/LLM)",
  "Senior Full Stack Engineer",
  "Principal Engineer, Integrations",
  "Senior Software Engineer (Distributed Systems)",
  "Backend Developer (Node/Postgres)",
  "Senior Developer, API Platform",
];

const SENIORITIES = ["mid", "senior", "staff", "lead"];

/**
 * Sinal de patrocinio por mercado. A rota remota (EU-remoto, BR-B2B) e sempre
 * `not_applicable_b2b`: e exatamente o recorte que um filtro binario
 * "precisa de patrocinio?" apagaria.
 */
const SPONSORSHIP_BY_MARKET: Record<Market, readonly SponsorshipSignal[]> = {
  CA: [
    "explicit_support",
    "newcomer_friendly",
    "silent",
    "requires_authorization",
    "requires_citizenship",
  ],
  IE: ["explicit_support", "silent", "requires_authorization", "explicit_no_sponsorship"],
  DE: ["explicit_support", "newcomer_friendly", "silent", "country_residency_required"],
  "EU-remoto": ["not_applicable_b2b"],
  "BR-B2B": ["not_applicable_b2b"],
};

const SALARY_BY_MARKET: Record<Market, string> = {
  CA: "CAD 130–165k/ano",
  IE: "€90–120k/ano",
  DE: "€85–110k/ano",
  "EU-remoto": "€6.5–8.5k/mês (contractor)",
  "BR-B2B": "R$ 28–38k/mês (PJ)",
};

const SOURCES = [
  "linkedin",
  "company_site",
  "vanhack",
  "recruiter",
  "referral",
  "radar",
  "other",
];

const WORK_MODES = ["remote", "hybrid", "onsite"];
const EMPLOYMENT_BY_MARKET: Record<Market, string> = {
  CA: "full_time",
  IE: "full_time",
  DE: "full_time",
  "EU-remoto": "b2b",
  "BR-B2B": "b2b",
};

const FIRST_NAMES = [
  "Aoife", "Bréanainn", "Clara", "Dmytro", "Elena", "Felix", "Greta", "Hannah",
  "Ines", "Jonas", "Karin", "Liam", "Marta", "Niall", "Olof", "Priya",
  "Quentin", "Rafaela", "Sven", "Tomás",
];
const LAST_NAMES = [
  "Ahlberg", "Bakker", "Costa", "Duarte", "Eriksen", "Fitzgerald", "Gruber",
  "Hoffmann", "Iversen", "Jenkins", "Keller", "Lindqvist", "Moreau", "Nowak",
  "O'Sullivan", "Petrov", "Quirke", "Rossi", "Steiner", "Thibault",
];

const CONTACT_ROLES = [
  "Technical Recruiter",
  "Talent Partner",
  "Engineering Manager",
  "Head of Talent",
  "Recruitment Consultant",
];

const REQUIREMENTS: { text: string; key: string }[] = [
  { text: "5+ anos com Node.js/TypeScript em produção", key: "node-typescript" },
  { text: "Experiência com PostgreSQL e modelagem relacional", key: "postgres" },
  { text: "Arquitetura de microserviços e mensageria", key: "microservices" },
  { text: "Kubernetes e pipelines de CI/CD", key: "kubernetes-cicd" },
  { text: "Go em serviços de alto throughput", key: "golang" },
  { text: "Integração com LLMs / RAG", key: "llm-rag" },
  { text: "Observabilidade (tracing, métricas, logs)", key: "observability" },
  { text: "AWS ou GCP em produção", key: "cloud" },
  { text: "Liderança técnica de squad", key: "tech-leadership" },
  { text: "Inglês fluente para reuniões diárias", key: "english" },
  { text: "Testes automatizados e TDD", key: "testing" },
  { text: "Domínio de pagamentos / PCI", key: "payments-domain" },
];

const SCREENING_QUESTIONS = [
  "Você tem autorização para trabalhar no país da vaga?",
  "Qual sua expectativa salarial anual?",
  "Descreva um sistema distribuído que você projetou do zero.",
  "Você já trabalhou em regime de contractor/B2B?",
  "Qual seu prazo de disponibilidade para começar?",
  "Conte sobre um incidente em produção que você resolveu.",
];

const HONESTY_NOTES: { ruleCode: string; noteMd: string; severity: string }[] = [
  {
    ruleCode: "R1",
    noteMd: "O rascunho dizia “7+ years” no resumo — corrigir para “6+ years”.",
    severity: "blocking",
  },
  {
    ruleCode: "R2",
    noteMd:
      "A carta usava a palavra “degree”. Trocar pela formulação canônica da formação.",
    severity: "blocking",
  },
  {
    ruleCode: "R3",
    noteMd: "Descrever o cloudscraper.js como “wrapper”, nunca como “port”.",
    severity: "blocking",
  },
  {
    ruleCode: "R5",
    noteMd:
      "Métrica de economia ainda é _(a preencher)_ — não arredondar para um número plausível.",
    severity: "blocking",
  },
  {
    ruleCode: "R6",
    noteMd:
      "A vaga pede Go, mas TypeScript/Node continua liderando o CV; Go entra como segunda linguagem.",
    severity: "warning",
  },
  {
    ruleCode: "R8",
    noteMd: "Data do projeto de facematch está em disputa — não citar no CV.",
    severity: "blocking",
  },
];

const CHECKLIST = [
  "CV adaptado à vaga",
  "Carta de apresentação revisada",
  "Respostas de triagem prontas",
  "Descrição da vaga verificada na fonte",
  "PDF gerado e revisado",
  "Enviado / registrado no tracker",
];

const ELIMINATION_REASONS = [
  "Exige cidadania",
  "Exige autorização de trabalho prévia",
  "Exige residência no país",
  "Presencial obrigatório",
  "Stack incompatível (Java/.NET)",
  "Faixa salarial abaixo do piso",
  "Vaga expirada",
];

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

/**
 * Apaga SO as fixtures. A ordem importa: `Document`, `Contact`, `Artifact` e
 * `DescriptionVerification` referenciam a candidatura com `onDelete: SetNull`
 * (nao Cascade), entao apagar a candidatura primeiro deixaria orfaos marcados
 * como demo espalhados pelo banco. Os filhos de verdade (evento, entrevista,
 * triagem, cobertura, checklist, nota de honestidade) sao Cascade e somem
 * junto com a candidatura.
 */
async function resetDemo(): Promise<void> {
  const tag = { lastSyncRunId: DEMO_RUN_ID };

  const artifacts = await db.artifact.deleteMany({ where: tag });
  const documents = await db.document.deleteMany({ where: tag });
  const contacts = await db.contact.deleteMany({ where: tag });
  const verifications = await db.descriptionVerification.deleteMany({ where: tag });
  const applications = await db.application.deleteMany({ where: tag });
  const scans = await db.radarScan.deleteMany({ where: tag }); // cascata: hits
  const jobs = await db.job.deleteMany({ where: tag });
  const companies = await db.company.deleteMany({ where: tag });
  await db.syncRun.deleteMany({ where: { id: DEMO_RUN_ID } });

  console.log(
    `[seed:demo] removidas: ${applications.count} candidatura(s), ${jobs.count} vaga(s), ` +
      `${companies.count} empresa(s), ${documents.count} documento(s), ${contacts.count} contato(s), ` +
      `${artifacts.count} artefato(s), ${verifications.count} verificação(ões), ${scans.count} varredura(s).`
  );
}

// ---------------------------------------------------------------------------
// seed
// ---------------------------------------------------------------------------

/** Estagios que ja implicam envio — usados para decidir se ha `appliedAt`. */
const SENT_STAGE_SET = new Set<FunnelStage>([
  "applied",
  "recruiter_contact",
  "screening",
  "assessment",
  "technical_challenge",
  "interview",
  "final_interview",
  "reference_check",
  "offer",
  "accepted",
  "rejected",
  "no_response",
  "ghosted",
]);

/** Estagios em que o pacote ja existe (documentos fazem sentido). */
const PACKAGED_STAGE_SET = new Set<FunnelStage>([
  "package_drafting",
  "package_ready",
  "awaiting_my_send",
  "ready",
  ...SENT_STAGE_SET,
]);

async function seedDemo(): Promise<void> {
  await db.syncRun.create({
    data: {
      id: DEMO_RUN_ID,
      status: "ok",
      note: "Fixtures de demonstração (dados sintéticos, apagáveis com --reset).",
      startedAt: BASE,
      finishedAt: BASE,
      filesSeen: 0,
      filesSent: 0,
    },
  });

  // ---- empresas ----------------------------------------------------------
  const companyIds = new Map<string, string>();
  for (const company of COMPANIES) {
    const folderName = `demo-${slugPart(company.name)}`;
    const row = await db.company.create({
      data: {
        folderName,
        name: company.name,
        country: company.market.startsWith("EU") ? "EU" : company.market.split("-")[0],
        city: company.city,
        market: company.market,
        industry: company.industry,
        sizeBucket: pick(["11-50", "51-200", "201-500", "501-1000", "1000+"]),
        website: `https://${slugPart(company.name)}.example`,
        careersUrl: `https://${slugPart(company.name)}.example/careers`,
        visibility: "private",
        sourcePath: `${DEMO_PREFIX}empresas/${folderName}.md`,
        lastSyncRunId: DEMO_RUN_ID,
        lastMcpTool: "seed:demo",
        lastSeenAt: BASE,
      },
      select: { id: true },
    });
    companyIds.set(company.name, row.id);
  }
  console.log(`[seed:demo] ${COMPANIES.length} empresas.`);

  // ---- candidaturas ------------------------------------------------------
  // Uma por estagio do funil primeiro (cobertura garantida dos 21), depois o
  // resto sorteado. Sem isso, os estagios raros nunca apareceriam e a tela de
  // funil ficaria verde por acidente.
  const TOTAL_APPLICATIONS = 35;
  const plannedStages: FunnelStage[] = [
    ...FUNNEL_STAGES,
    ...Array.from({ length: TOTAL_APPLICATIONS - FUNNEL_STAGES.length }, () =>
      pick([
        "radar",
        "shortlisted",
        "package_ready",
        "applied",
        "screening",
        "interview",
        "offer",
        "rejected",
        "no_response",
      ] as const)
    ),
  ];

  const usedFolders = new Set<string>();
  const jobIds: string[] = [];
  let documentCount = 0;
  let eventCount = 0;
  let contactCount = 0;
  let coverageCount = 0;
  let questionCount = 0;
  let honestyCount = 0;
  let checklistCount = 0;

  for (const [index, stage] of plannedStages.entries()) {
    const company = COMPANY_ROTATION[index % COMPANY_ROTATION.length];
    const market = company.market;
    const role = ROLES[index % ROLES.length];
    const companyId = companyIds.get(company.name)!;
    const companySlug = slugPart(company.name);

    // Chave natural unica, com a mesma forma da que o vault produz.
    let folderName = `demo-${companySlug}--${slugPart(role)}`;
    let suffix = 1;
    while (usedFolders.has(folderName)) {
      suffix += 1;
      folderName = `demo-${companySlug}--${slugPart(role)}-${suffix}`;
    }
    usedFolders.add(folderName);

    const sponsorship = pick(SPONSORSHIP_BY_MARKET[market]);
    const daysSinceFound = int(3, 120);

    const job = await db.job.create({
      data: {
        sourceUrl: `demo://jobs/${folderName}`,
        companyId,
        title: role,
        seniority: pick(SENIORITIES),
        market,
        locationText: company.city,
        workMode: market.includes("remoto") || market === "BR-B2B" ? "remote" : pick(WORK_MODES),
        employmentType: EMPLOYMENT_BY_MARKET[market],
        salaryText: SALARY_BY_MARKET[market],
        currency: market === "CA" ? "CAD" : market === "BR-B2B" ? "BRL" : "EUR",
        sponsorship,
        descriptionMd: `## ${role}\n\n${company.name} procura pessoa engenheira para o time de plataforma. Stack: TypeScript/Node, PostgreSQL, AWS.\n\n_(descrição sintética de demonstração)_`,
        requirementsMd: REQUIREMENTS.slice(0, 5)
          .map((requirement) => `- ${requirement.text}`)
          .join("\n"),
        postedAt: daysAgo(daysSinceFound + int(1, 10)),
        active: !["rejected", "accepted", "withdrawn", "skipped"].includes(stage),
        priority: int(1, 3),
        fitScore: int(45, 95),
        visibility: "private",
        sourcePath: `${DEMO_PREFIX}vagas/${folderName}.md`,
        lastSyncRunId: DEMO_RUN_ID,
        lastMcpTool: "seed:demo",
        lastSeenAt: BASE,
      },
      select: { id: true },
    });
    jobIds.push(job.id);

    await db.jobTech.createMany({
      data: ["typescript", "node", "postgres", "aws", "kubernetes", "go"]
        .slice(0, int(3, 6))
        .map((tech, rank) => ({
          jobId: job.id,
          tech,
          skillSlug: tech,
          required: rank < 3,
          rank,
        })),
      skipDuplicates: true,
    });

    const sent = SENT_STAGE_SET.has(stage);
    const appliedAt = sent ? daysAgo(daysSinceFound - int(0, 2)) : null;
    const responded = sent && rng() > 0.35;

    const application = await db.application.create({
      data: {
        folderName,
        companyId,
        jobId: job.id,
        stage,
        packageStatus: PACKAGED_STAGE_SET.has(stage) ? (sent ? "sent" : "ready") : "draft",
        roleTitle: role,
        market,
        // Deixa NULO na maioria: a heranca `application -> job` e justamente o
        // caminho que a tela precisa exercitar. So sobrescreve quando a
        // candidatura tem sinal proprio (recrutador confirmou algo diferente).
        sponsorship: rng() > 0.8 ? sponsorship : null,
        priority: int(1, 3),
        source: pick(SOURCES),
        fit: pick(["⭐", "⭐ Go", "⭐ IA/LLM", "Bom", "Médio"]),
        appliedAt,
        firstResponseAt: responded ? daysAgo(daysSinceFound - int(3, 10)) : null,
        closedAt: ["rejected", "accepted", "withdrawn", "skipped"].includes(stage)
          ? daysAgo(int(1, 20))
          : null,
        outcomeReason:
          stage === "rejected"
            ? pick([
                "Perfil sênior demais para a faixa",
                "Seguiram com candidato local",
                "Congelaram a vaga",
              ])
            : stage === "withdrawn"
              ? "Retirei: faixa abaixo do piso"
              : stage === "skipped"
                ? "Descartada na triagem própria"
                : null,
        targetSalary: SALARY_BY_MARKET[market],
        followUp: sent && rng() > 0.5 ? `cobrar em ${int(3, 15)} dias` : null,
        summaryMd: `Candidatura sintética de demonstração para ${company.name} (${market}).`,
        notesMd: `Empresa fictícia usada para verificar o painel. Mercado ${market}, sinal de patrocínio \`${sponsorship}\`.`,
        visibility: "private",
        sourcePath: `${DEMO_PREFIX}candidaturas/${folderName}/README.md`,
        lastSyncRunId: DEMO_RUN_ID,
        lastMcpTool: "seed:demo",
        lastSeenAt: BASE,
      },
      select: { id: true },
    });

    // ---- documentos ------------------------------------------------------
    if (PACKAGED_STAGE_SET.has(stage)) {
      const kinds: { kind: "cv" | "cover_letter" | "job_data" | "screening_answers" | "notes"; title: string }[] = [
        { kind: "cv", title: `CV — ${company.name}` },
        { kind: "cover_letter", title: `Carta — ${company.name}` },
        { kind: "job_data", title: "Dados da Vaga" },
      ];
      if (sent) kinds.push({ kind: "screening_answers", title: "Respostas de triagem" });
      if (rng() > 0.6) kinds.push({ kind: "notes", title: "Notas da pesquisa" });

      await db.document.createMany({
        data: kinds.map((doc) => ({
          filePath: `${DEMO_PREFIX}candidaturas/${folderName}/${doc.kind}.md`,
          applicationId: application.id,
          kind: doc.kind,
          title: doc.title,
          language: doc.kind === "notes" ? "pt-BR" : "en-US",
          status: sent ? "sent" : "final",
          contentMd: `# ${doc.title}\n\nConteúdo sintético de demonstração.`,
          wordCount: int(180, 900),
          sentAt: sent ? appliedAt : null,
          visibility: "private" as const,
          sourcePath: `${DEMO_PREFIX}candidaturas/${folderName}/${doc.kind}.md`,
          lastSyncRunId: DEMO_RUN_ID,
          lastMcpTool: "seed:demo",
          lastSeenAt: BASE,
        })),
        skipDuplicates: true,
      });
      documentCount += kinds.length;

      await db.checklistItem.createMany({
        data: CHECKLIST.map((label, orderIndex) => ({
          applicationId: application.id,
          orderIndex,
          label,
          done: sent ? orderIndex < CHECKLIST.length : orderIndex < int(1, 4),
          doneAt: sent ? appliedAt : null,
          sourceKey: `${folderName}#checklist#${orderIndex}`,
          visibility: "private" as const,
          sourcePath: `${DEMO_PREFIX}candidaturas/${folderName}/checklist.md`,
          lastSyncRunId: DEMO_RUN_ID,
          lastMcpTool: "seed:demo",
        })),
        skipDuplicates: true,
      });
      checklistCount += CHECKLIST.length;
    }

    // ---- linha do tempo --------------------------------------------------
    const events: {
      type: string;
      direction: "inbound" | "outbound" | null;
      subject: string;
      days: number;
    }[] = [
      {
        type: "note",
        direction: null,
        subject: "Vaga encontrada no radar",
        days: daysSinceFound,
      },
    ];
    if (PACKAGED_STAGE_SET.has(stage)) {
      events.push({
        type: "package_ready",
        direction: null,
        subject: "Pacote (CV + carta) pronto",
        days: Math.max(1, daysSinceFound - 2),
      });
    }
    if (sent) {
      events.push({
        type: "email_sent",
        direction: "outbound",
        subject: "Candidatura enviada",
        days: Math.max(1, daysSinceFound - 3),
      });
    }
    if (responded) {
      events.push({
        type: "reply_received",
        direction: "inbound",
        subject: "Recrutador respondeu",
        days: Math.max(1, daysSinceFound - 8),
      });
    }
    if (["interview", "final_interview", "offer", "accepted"].includes(stage)) {
      events.push({
        type: "interview_scheduled",
        direction: "inbound",
        subject: "Entrevista agendada",
        days: Math.max(1, daysSinceFound - 12),
      });
    }

    await db.applicationEvent.createMany({
      data: events.map((event, i) => ({
        applicationId: application.id,
        occurredAt: daysAgo(event.days),
        type: event.type,
        direction: event.direction,
        toStage: i === events.length - 1 ? stage : null,
        channel: event.direction ? "email" : null,
        subject: event.subject,
        bodyMd: `_(evento sintético de demonstração)_`,
        sourceKey: `${folderName}#event#${i}`,
        visibility: "private" as const,
        sourcePath: `${DEMO_PREFIX}candidaturas/${folderName}/eventos.md`,
        lastSyncRunId: DEMO_RUN_ID,
        lastMcpTool: "seed:demo",
      })),
      skipDuplicates: true,
    });
    eventCount += events.length;

    // ---- contato (recrutador) -------------------------------------------
    if (sent || rng() > 0.6) {
      const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      // `@@unique([companyId, name])`: duas candidaturas na mesma empresa
      // podem sortear a mesma pessoa. `upsert` mantem a fixture idempotente
      // em vez de estourar no meio da rodada.
      await db.contact.upsert({
        where: { companyId_name: { companyId, name } },
        update: { applicationId: application.id },
        create: {
          companyId,
          applicationId: application.id,
          name,
          roleTitle: pick(CONTACT_ROLES),
          email: `${slugPart(name)}@${companySlug}.example`,
          linkedinUrl: `https://www.linkedin.com/in/${slugPart(name)}-demo`,
          channel: pick(["linkedin", "email", "vanhack"]),
          timezone: market === "CA" ? "America/Toronto" : "Europe/Dublin",
          notesMd: "Contato sintético de demonstração.",
          sourceKey: `${folderName}#contact`,
          visibility: "private",
          sourcePath: `${DEMO_PREFIX}candidaturas/${folderName}/contato.md`,
          lastSyncRunId: DEMO_RUN_ID,
          lastMcpTool: "seed:demo",
          lastSeenAt: BASE,
        },
      });
      contactCount += 1;
    }

    // ---- matriz requisito x evidencia -----------------------------------
    const requirements = REQUIREMENTS.slice(index % 6, (index % 6) + int(4, 6));
    await db.requirementCoverage.createMany({
      data: requirements.map((requirement, orderIndex) => ({
        applicationId: application.id,
        jobId: job.id,
        orderIndex,
        requirement: requirement.text,
        requirementKey: requirement.key,
        coverage: pick(["strong", "has", "shallow", "gap", "advantage"] as const),
        evidenceMd: `Evidência sintética para \`${requirement.key}\`.`,
        sourceKey: `${folderName}#coverage#${requirement.key}`,
        visibility: "private" as const,
        sourcePath: `${DEMO_PREFIX}candidaturas/${folderName}/matriz.md`,
        lastSyncRunId: DEMO_RUN_ID,
        lastMcpTool: "seed:demo",
      })),
      skipDuplicates: true,
    });
    coverageCount += requirements.length;

    // ---- perguntas de triagem -------------------------------------------
    if (sent || stage === "ready" || stage === "package_ready") {
      const questions = SCREENING_QUESTIONS.slice(0, int(2, 4));
      await db.screeningQuestion.createMany({
        data: questions.map((question, orderIndex) => ({
          applicationId: application.id,
          jobId: job.id,
          orderIndex,
          question,
          answer: "Resposta sintética de demonstração.",
          language: "en-US",
          required: orderIndex === 0,
          sourceKey: `${folderName}#question#${orderIndex}`,
          visibility: "private" as const,
          sourcePath: `${DEMO_PREFIX}candidaturas/${folderName}/triagem.md`,
          lastSyncRunId: DEMO_RUN_ID,
          lastMcpTool: "seed:demo",
        })),
        skipDuplicates: true,
      });
      questionCount += questions.length;
    }

    // ---- notas de honestidade (as linhas ⚠️ do vault) --------------------
    if (rng() > 0.5) {
      const notes = HONESTY_NOTES.slice(index % 3, (index % 3) + int(1, 2));
      await db.honestyNote.createMany({
        data: notes.map((note, i) => ({
          applicationId: application.id,
          ruleCode: note.ruleCode,
          scope: pick(["resume", "cover_letter", "screening"]),
          noteMd: note.noteMd,
          severity: note.severity,
          sourceKey: `${folderName}#honesty#${i}`,
          // CHECK no banco: esta tabela e private-only. Nao mude.
          visibility: "private" as const,
          sourcePath: `${DEMO_PREFIX}candidaturas/${folderName}/avisos.md`,
          lastSyncRunId: DEMO_RUN_ID,
          lastMcpTool: "seed:demo",
        })),
        skipDuplicates: true,
      });
      honestyCount += notes.length;
    }

    // ---- entrevista ------------------------------------------------------
    if (["interview", "final_interview", "offer", "accepted"].includes(stage)) {
      await db.interview.create({
        data: {
          applicationId: application.id,
          round: stage === "final_interview" ? 3 : 1,
          kind: stage === "final_interview" ? "final" : pick(["screening", "technical", "system_design"]),
          scheduledAt: daysAgo(int(1, 15)),
          durationMin: pick([30, 45, 60]),
          mode: "video",
          timezone: market === "CA" ? "America/Toronto" : "Europe/Dublin",
          interviewers: [`${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`],
          prepMd: "Preparação sintética de demonstração.",
          outcome: stage === "offer" || stage === "accepted" ? "passed" : "pending",
          sourceKey: `${folderName}#interview#1`,
          visibility: "private",
          sourcePath: `${DEMO_PREFIX}candidaturas/${folderName}/entrevista.md`,
          lastSyncRunId: DEMO_RUN_ID,
          lastMcpTool: "seed:demo",
        },
      });
    }
  }

  console.log(
    `[seed:demo] ${plannedStages.length} candidaturas · ${documentCount} documentos · ` +
      `${eventCount} eventos · ${contactCount} contatos · ${coverageCount} coberturas · ` +
      `${questionCount} perguntas · ${honestyCount} avisos · ${checklistCount} itens de checklist.`
  );

  // ---- radar --------------------------------------------------------------
  // ~190 hits numa varredura, que e a ordem de grandeza real do
  // "Radar de Vagas 2026-08-04" — o volume que derruba filtro client-side.
  const TOTAL_HITS = 190;
  const scan = await db.radarScan.create({
    data: {
      scanKey: "demo-2026-08-14",
      scannedAt: daysAgo(2),
      totalFound: TOTAL_HITS,
      notesMd: "Varredura sintética de demonstração.",
      visibility: "private",
      sourcePath: `${DEMO_PREFIX}radar/demo-2026-08-14.md`,
      lastSyncRunId: DEMO_RUN_ID,
      lastMcpTool: "seed:demo",
      lastSeenAt: BASE,
    },
    select: { id: true },
  });

  await db.radarScoringRule.createMany({
    data: [
      { code: "B1", label: "Remota com pagamento em moeda forte", kind: "boost", weight: 30 },
      { code: "B2", label: "Stack TypeScript/Node como principal", kind: "boost", weight: 25 },
      { code: "B3", label: "Contratação como contractor/B2B", kind: "boost", weight: 20 },
      { code: "P1", label: "Presencial obrigatório", kind: "penalty", weight: -20 },
      { code: "E1", label: "Exige cidadania ou autorização prévia", kind: "eliminator", weight: -100 },
      { code: "E2", label: "Faixa salarial abaixo do piso", kind: "eliminator", weight: -100 },
    ].map((rule) => ({ ...rule, radarScanId: scan.id, description: "Regra sintética." })),
    skipDuplicates: true,
  });

  const hits = Array.from({ length: TOTAL_HITS }, (_, i) => {
    const company = COMPANIES[i % COMPANIES.length];
    const role = ROLES[i % ROLES.length];
    const score = int(10, 98);
    const verdict = score >= 75 ? "shortlisted" : score >= 45 ? "kept" : "eliminated";
    return {
      radarScanId: scan.id,
      // Só os primeiros hits viram vaga de verdade: no radar real, a maioria
      // morre na varredura e nunca ganha pasta.
      jobId: i < jobIds.length ? jobIds[i] : null,
      sourceUrl: `demo://radar/2026-08-14/${i + 1}`,
      title: role,
      companyName: company.name,
      score,
      rank: i + 1,
      verdict,
      eliminationReason: verdict === "eliminated" ? pick(ELIMINATION_REASONS) : null,
      sponsorship: pick(SPONSORSHIP_BY_MARKET[company.market]),
      visibility: "private" as const,
      lastSyncRunId: DEMO_RUN_ID,
      lastMcpTool: "seed:demo",
    };
  });
  await db.radarHit.createMany({ data: hits, skipDuplicates: true });

  const kept = hits.filter((hit) => hit.verdict !== "eliminated").length;
  await db.radarScan.update({
    where: { id: scan.id },
    data: { kept, eliminated: TOTAL_HITS - kept },
  });
  console.log(`[seed:demo] radar: ${TOTAL_HITS} hits (${kept} mantidos).`);

  // ---- verificação de descrição ------------------------------------------
  await db.descriptionVerification.createMany({
    data: jobIds.slice(0, 12).map((jobId, i) => ({
      jobId,
      sourceUrl: `demo://jobs/verificacao/${i}`,
      verifiedAt: daysAgo(int(1, 20)),
      verdict: pick(["confirmado", "divergente", "inacessível", "expirada"]),
      method: pick(["manual", "fetch", "recruiter"]),
      checkedFields: ["salário", "modelo de trabalho", "patrocínio"],
      discrepancyMd: "Divergência sintética de demonstração.",
      sourceKey: `demo#verification#${i}`,
      visibility: "private" as const,
      sourcePath: `${DEMO_PREFIX}radar/verificacao.md`,
      lastSyncRunId: DEMO_RUN_ID,
      lastMcpTool: "seed:demo",
    })),
    skipDuplicates: true,
  });
}

// ---------------------------------------------------------------------------

async function main() {
  const resetOnly = process.argv.includes("--reset");

  // Reset SEMPRE roda antes de inserir: a fixture e um conjunto fechado, e
  // "rodar de novo" tem que produzir o mesmo painel, nao o dobro dele.
  await resetDemo();
  if (resetOnly) {
    console.log("[seed:demo] --reset: nada foi criado.");
    return;
  }
  await seedDemo();
  console.log(
    "[seed:demo] pronto. Tudo nasceu `private` e marcado com " +
      `lastSyncRunId="${DEMO_RUN_ID}" — apague com \`pnpm db:seed:demo --reset\`.`
  );
}

main()
  .catch((error) => {
    console.error("[seed:demo] falhou:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
