#!/usr/bin/env node
/**
 * As fixtures da varredura de acessibilidade — montar e DESMONTAR.
 *
 * `scripts/a11y-admin-axe.mjs` mede 23 superfícies do admin, e três delas só
 * existem se houver dado: `/admin/projects/<id>/edit`,
 * `/admin/generator/<id>` e a listagem `/admin/api-keys`. O
 * `pnpm db:seed:demo` popula candidaturas, contatos e empresas, mas não
 * cria projeto, geração nem chave — e o login precisa de um usuário cuja
 * senha exista em algum lugar (a do admin de verdade não existe em texto).
 *
 * A auditoria da bko-05 criou essas quatro linhas à mão no Postgres de dev.
 * Estado criado à mão é estado que ninguém consegue repetir nem remover com
 * confiança; por isso ele vira este script, com os dois sentidos:
 *
 *   export A11Y_PW="$(node -e 'console.log(require("crypto").randomBytes(18).toString("base64url"))')"
 *   node scripts/a11y-fixtures.mjs up      # cria/atualiza as quatro linhas
 *   …roda a varredura com ADMIN_EMAIL=a11y-audit@local.test ADMIN_PASSWORD="$A11Y_PW"…
 *   node scripts/a11y-fixtures.mjs down    # remove tudo o que o `up` criou
 *
 * A senha NUNCA é impressa, gravada em arquivo nem lida do repositório: ela
 * chega por `A11Y_PW` e sai daqui como hash bcrypt. `up` é idempotente
 * (upsert por id), então rodar duas vezes só redefine a senha.
 *
 * DEV APENAS: o script recusa qualquer `DATABASE_URL` que não aponte para
 * localhost. O usuário criado é um admin de verdade dentro do banco em que
 * roda — em produção isso seria uma porta dos fundos.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const MODE = process.argv[2];
if (!["up", "down"].includes(MODE)) {
  console.error("uso: node scripts/a11y-fixtures.mjs up|down");
  process.exit(2);
}

/* `next dev` lê .env.local; o Prisma CLI lê .env. Este script aceita a
   variável já exportada e, se não houver, procura na .env.local — a mesma
   precedência que o a11y-admin-axe.mjs usa para as credenciais. */
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = file.split("\n").find((l) => l.startsWith("DATABASE_URL="));
  const value = line ? line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "") : "";
  if (!value) throw new Error("DATABASE_URL não encontrada nem no ambiente nem na .env.local");
  return value;
}

const url = databaseUrl();
const host = new URL(url).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error(`recusado: DATABASE_URL aponta para ${host}, e estas fixtures são só de desenvolvimento.`);
  process.exit(2);
}

const IDS = {
  user: "a11yuser0000000000000001",
  project: "a11yproj0000000000000001",
  generation: "a11ygen00000000000000001",
  apiKey: "a11ykey00000000000000001",
};
const EMAIL = "a11y-audit@local.test";

const prisma = new PrismaClient({ datasources: { db: { url } } });

try {
  if (MODE === "up") {
    const password = process.env.A11Y_PW ?? "";
    if (password.length < 12) {
      throw new Error(
        "A11Y_PW vazio ou curto demais: exporte uma senha aleatória antes " +
          "(node -e 'console.log(require(\"crypto\").randomBytes(18).toString(\"base64url\"))').",
      );
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { id: IDS.user },
      update: { email: EMAIL, name: "Auditoria a11y", passwordHash, role: "admin" },
      create: { id: IDS.user, email: EMAIL, name: "Auditoria a11y", passwordHash, role: "admin" },
    });
    const project = {
      slug: "a11y-fixture",
      name: "Projeto de auditoria a11y",
      year: "2026",
      category: "web",
      monogram: "AA",
      accentFrom: "#BF9EEE",
      accentTo: "#97E1F1",
      stackJson: '["Next.js","Prisma"]',
      tagline: "Linha de vitrine usada na varredura de acessibilidade.",
      description: "Descrição longa do projeto de fixture.",
      role: "Autor",
      featuresJson: '["um","dois"]',
    };
    await prisma.project.upsert({
      where: { id: IDS.project },
      update: project,
      create: { id: IDS.project, ...project },
    });
    const generation = {
      company: "Acme Tecnologia",
      roleTitle: "Staff Engineer",
      language: "pt",
      jobDescription: "Descrição da vaga colada.",
      resume: "# Currículo\n\n- bullet um\n- bullet dois",
      coverLetter: "Carta de apresentação.",
      screeningAnswers: "Respostas de triagem.",
      sourcesJson: '["knowledge/cv.md"]',
    };
    await prisma.generation.upsert({
      where: { id: IDS.generation },
      update: generation,
      create: { id: IDS.generation, ...generation },
    });
    /* `keyHash` é HMAC-SHA256 hex de um token; 64 vezes "a" não é imagem de
       token nenhum, então esta linha aparece na listagem e NÃO autentica. */
    const apiKey = {
      name: "chave de fixture a11y",
      keyHash: "a".repeat(64),
      keyPrefix: "mk_live_a11ydeaf",
      scopes: ["read"],
      note: "fixture da varredura",
    };
    await prisma.apiKey.upsert({
      where: { id: IDS.apiKey },
      update: apiKey,
      create: { id: IDS.apiKey, ...apiKey },
    });
    console.log(
      `fixtures a11y no ar em ${host}: user ${EMAIL}, project ${IDS.project}, ` +
        `generation ${IDS.generation}, apiKey ${IDS.apiKey} (senha só no ambiente, nunca impressa)`,
    );
  } else {
    const removed = {
      apiKey: (await prisma.apiKey.deleteMany({ where: { id: IDS.apiKey } })).count,
      generation: (await prisma.generation.deleteMany({ where: { id: IDS.generation } })).count,
      project: (await prisma.project.deleteMany({ where: { id: IDS.project } })).count,
      user: (await prisma.user.deleteMany({ where: { id: IDS.user } })).count,
      /* Rastro da própria auditoria: cada passagem faz um login, e o
         throttle guarda um contador por IP por janela de 15 min. */
      loginThrottle: (
        await prisma.mcpRateLimit.deleteMany({ where: { bucket: { startsWith: "login:" } } })
      ).count,
    };
    console.log(
      `fixtures a11y removidas de ${host}: ` +
        Object.entries(removed)
          .map(([k, n]) => `${k} ${n}`)
          .join(" · "),
    );
    const left = await prisma.user.count({ where: { email: EMAIL } });
    if (left > 0) throw new Error("o usuário de auditoria continua no banco");
  }
} finally {
  await prisma.$disconnect();
}
