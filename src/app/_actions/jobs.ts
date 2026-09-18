"use server";

/**
 * Ações do RADAR de vagas (`/admin/jobs`).
 *
 * A única mutação desta tela é a promoção: **transformar uma vaga do radar em
 * candidatura**. É a fronteira entre as duas metades do sistema — o radar é
 * observação (o que existe lá fora), o funil é compromisso (o que eu estou
 * perseguindo) — e por isso ela não é um `update` de campo, é uma criação com
 * três cuidados:
 *
 * 1. **`folderName` único de verdade.** É a chave natural que o MCP usa para
 *    deduplicar (`upsert_application`). Duas vagas da mesma empresa com o mesmo
 *    cargo (mercados diferentes, ou reabertura da vaga) colidiriam — então a
 *    chave é derivada pela MESMA regra da migration e do seed
 *    (`buildFolderName`) e, só em caso de colisão real, ganha um sufixo
 *    numérico. Nunca um sufixo silencioso quando não há colisão: isso quebraria
 *    o encontro com a pasta do vault.
 * 2. **Empresa é entidade, não string.** A vaga do radar às vezes só tem o nome
 *    da empresa em texto (`RadarHit.companyName`). Aqui ele vira/reaproveita
 *    uma `Company` pela chave natural, e a vaga passa a apontar para ela — a
 *    próxima leitura do radar já mostra a entidade.
 * 3. **A candidatura nasce em `shortlisted`, não em `radar`.** Sair do radar É
 *    a decisão; deixá-la em `radar` faria a tela de candidaturas repetir o que
 *    o radar já mostra. O evento correspondente entra na linha do tempo.
 *
 * A action **não** redireciona (§2 do `src/app/admin/AGENTS.md`: `redirect()`
 * lança e mataria o `toast.success`). Ela devolve o id e quem navega é o
 * cliente.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db, dbConfigured } from "@/lib/db";
import { buildFolderName, slugPart } from "@/lib/applications";
import { sourceFromBoard } from "@/app/admin/jobs/radar";
import type { ActionResult } from "./action-result";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login"); // A2 — fora de try/catch
}

export type PromotedApplication = {
  id: string;
  folderName: string;
  /** `false` quando a vaga já tinha candidatura e nós só devolvemos a existente. */
  created: boolean;
};

/** Rótulo de empresa para a chave natural, na ordem de confiabilidade:
 * entidade > texto da varredura > domínio do anúncio. */
function companyLabel(
  companyName: string | null | undefined,
  hitCompanyName: string | null | undefined,
  sourceUrl: string,
): string {
  const fromEntity = companyName?.trim();
  if (fromEntity) return fromEntity;
  const fromHit = hitCompanyName?.trim();
  if (fromHit) return fromHit;
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
    if (host) return host;
  } catch {
    // URL sintética (`demo://…`): cai no rótulo genérico abaixo.
  }
  return "empresa a definir";
}

/**
 * `base`, `base-2`, `base-3`… A varredura de nomes tomados é UMA consulta com
 * `startsWith`; o laço só olha o que já veio.
 */
async function uniqueFolderName(base: string): Promise<string> {
  const taken = new Set(
    (
      await db.application.findMany({
        where: { folderName: { startsWith: base } },
        select: { folderName: true },
      })
    ).map((row) => row.folderName),
  );
  if (!taken.has(base)) return base;
  for (let suffix = 2; suffix <= 50; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  // 50 candidaturas na mesma vaga é um bug em outro lugar; ainda assim não
  // devolvemos uma chave duplicada.
  return `${base}-${Date.now().toString(36)}`;
}

export async function createApplicationFromJob(
  jobId: string,
): Promise<ActionResult<PromotedApplication>> {
  await requireAdmin(); // A2
  if (!dbConfigured) {
    return { ok: false, message: "Banco indisponível. Configure DATABASE_URL." }; // A3
  }

  try {
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        sourceUrl: true,
        title: true,
        market: true,
        priority: true,
        fitScore: true,
        companyId: true,
        company: { select: { name: true } },
        applications: {
          select: { id: true, folderName: true },
          orderBy: [{ updatedAt: "desc" }],
          take: 1,
        },
        radarHits: {
          select: {
            companyName: true,
            score: true,
            verdict: true,
            radarScan: { select: { scanKey: true } },
          },
          orderBy: [{ createdAt: "desc" }],
          take: 1,
        },
      },
    });

    if (!job) return { ok: false, message: "Vaga não encontrada." };

    // Idempotência: promover duas vezes não cria duas candidaturas. Isso não é
    // luxo — o botão pode ser clicado duas vezes, e o radar pode ter sido
    // promovido numa outra aba.
    const existing = job.applications[0];
    if (existing) {
      return {
        ok: true,
        data: { id: existing.id, folderName: existing.folderName, created: false },
        message: "Esta vaga já tinha candidatura — abrindo a existente.",
      };
    }

    const hit = job.radarHits[0] ?? null;
    const label = companyLabel(job.company?.name, hit?.companyName, job.sourceUrl);

    let companyId = job.companyId;
    if (!companyId) {
      const folderName = slugPart(label);
      const found = await db.company.findUnique({
        where: { folderName },
        select: { id: true },
      });
      companyId =
        found?.id ??
        (
          await db.company.create({
            data: {
              folderName,
              name: label,
              market: job.market,
              lastMcpTool: "admin:createApplicationFromJob",
            },
            select: { id: true },
          })
        ).id;
      // A vaga passa a apontar para a entidade: a próxima leitura do radar
      // mostra `Company.name` em vez do texto cru do hit.
      await db.job.update({ where: { id: job.id }, data: { companyId } });
    }

    const folderName = await uniqueFolderName(
      buildFolderName({
        company: label,
        roleTitle: job.title,
        market: job.market,
      }),
    );

    const provenance = [
      "Criada a partir do radar de vagas.",
      hit?.radarScan?.scanKey ? `Varredura: ${hit.radarScan.scanKey}.` : null,
      hit?.score != null ? `Pontuação do radar: ${hit.score}.` : null,
      hit?.verdict ? `Veredito: ${hit.verdict}.` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const created = await db.application.create({
      data: {
        folderName,
        companyId,
        jobId: job.id,
        // Sair do radar É a decisão — a candidatura não nasce em `radar`.
        stage: "shortlisted",
        roleTitle: job.title,
        market: job.market,
        // `null` = herda `job.sponsorship`. Copiar o valor aqui congelaria o
        // sinal e a vaga deixaria de corrigi-lo na próxima sincronização.
        sponsorship: null,
        source: sourceFromBoard(job.sourceUrl),
        priority: job.priority,
        // `fit` é rótulo subjetivo do usuário ("⭐", "Bom"), não score
        // calculado — ver o comentário do campo em `schema.prisma`. A
        // pontuação do radar fica em `notesMd`, onde é proveniência, não juízo.
        notesMd: provenance,
        lastMcpTool: "admin:createApplicationFromJob",
        lastSeenAt: new Date(),
        events: {
          create: {
            type: "stage_change",
            toStage: "shortlisted",
            subject: "Promovida do radar",
            bodyMd: provenance,
            lastMcpTool: "admin:createApplicationFromJob",
          },
        },
      },
      select: { id: true, folderName: true },
    });

    revalidatePath("/admin/jobs");
    revalidatePath("/admin/applications");
    revalidatePath("/admin");

    return {
      ok: true,
      data: { id: created.id, folderName: created.folderName, created: true },
      message: `Candidatura “${created.folderName}” criada.`,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Corrida entre dois cliques/abas: a outra chamada ganhou a chave.
      return {
        ok: false,
        message:
          "Já existe uma candidatura com essa chave. Recarregue a lista e tente de novo.",
      };
    }
    console.error("[admin] create application from job failed", err);
    return { ok: false, message: "Não foi possível criar a candidatura." };
  }
}
