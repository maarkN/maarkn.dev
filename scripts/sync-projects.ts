/**
 * Brings the `Project` table in line with `src/lib/projects.ts`, without
 * touching text (ADR 0003: the database is the source of the projects' text).
 *
 * The public site reads projects DB-first, and `prisma/seed.ts` only inserts
 * into an empty table, so a project added to the static list never reaches a
 * database that was already seeded. This script closes that gap:
 *
 *   - creates every static project that is missing, with the copy of both
 *     dictionaries;
 *   - on the ones that exist, updates only what is not text (year, category,
 *     status, featured, cover, stack, visibility, links);
 *   - deletes the rows listed in `retiredProjectSlugs`;
 *   - leaves alone any other row (projects created in the admin), every uploaded
 *     `coverImage`, the gallery and the choice of success cases.
 *
 * To fill in text a row lacks, see `scripts/fill-project-text.ts`.
 *
 *   pnpm db:sync-projects                (local)
 *   docker compose -f docker-compose.prod.yml run --rm --entrypoint sh migrate -c "pnpm db:sync-projects"
 */
import { PrismaClient } from "@prisma/client";
import { metadataColumns, newRow } from "../src/lib/project-seed";
import { projects, retiredProjectSlugs } from "../src/lib/projects";

const db = new PrismaClient();

async function main() {
  // In a table that already has projects, which ones are success cases is
  // Marco's choice, even when that choice is "none".
  const withCase = (await db.project.count()) === 0;

  for (const p of projects) {
    const existing = await db.project.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (existing) {
      await db.project.update({ where: { id: existing.id }, data: metadataColumns(p) });
    } else {
      await db.project.create({ data: newRow(p, { withCase }) });
    }
    console.log(`[sync-projects] ${existing ? "updated" : "created"} ${p.slug}`);
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
