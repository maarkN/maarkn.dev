/**
 * Brings the `Project` table in line with `src/lib/projects.ts`.
 *
 * The public site reads projects DB-first, and `prisma/seed.ts` only inserts
 * into an empty table, so a change to the static list never reaches a database
 * that was already seeded. This script closes that gap:
 *
 *   - upserts every static project by slug (name, year, category, status,
 *     featured, cover colours, stack, links), with the English copy from
 *     `src/dictionaries/en.json` as the DB fallback text;
 *   - deletes the rows listed in `retiredProjectSlugs`;
 *   - leaves alone any other row (projects created in the admin) and every
 *     uploaded `coverImage`.
 *
 *   pnpm db:sync-projects                (local)
 *   docker compose -f docker-compose.prod.yml run --rm --entrypoint sh migrate -c "pnpm db:sync-projects"
 */
import { PrismaClient } from "@prisma/client";
import en from "../src/dictionaries/en.json";
import { projects, retiredProjectSlugs } from "../src/lib/projects";
import { encodeStringList } from "../src/lib/json-list";

const db = new PrismaClient();

type Detail = { description: string; role: string; features: string[] };
const taglines = en.projects.taglines as Record<string, string | undefined>;
const details = en.projects.details as Record<string, Detail | undefined>;

async function main() {
  for (const p of projects) {
    const detail = details[p.slug];
    const data = {
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
      repoUrl: p.sourceVisibility === "private" ? null : (p.links?.repo ?? null),
      demoUrl: p.links?.demo ?? null,
      caseUrl: p.links?.case ?? null,
      tagline: taglines[p.slug] ?? null,
      description: detail?.description ?? null,
      role: detail?.role ?? null,
      featuresJson: encodeStringList(detail?.features ?? []),
    };
    const existed = await db.project.findUnique({ where: { slug: p.slug }, select: { id: true } });
    await db.project.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });
    console.log(`[sync-projects] ${existed ? "updated" : "created"} ${p.slug}`);
  }

  if (retiredProjectSlugs.length > 0) {
    const { count } = await db.project.deleteMany({ where: { slug: { in: retiredProjectSlugs } } });
    console.log(`[sync-projects] removed ${count} retired project(s): ${retiredProjectSlugs.join(", ")}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
