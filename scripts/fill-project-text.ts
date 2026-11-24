/**
 * Copies the projects' text from the dictionaries into the rows that lack it:
 * both languages, and the success case of the three projects that have one.
 *
 * It is the content half of the `portfolio_content` migration, and the `migrate`
 * service runs it right after `prisma migrate deploy` (docker-compose.prod.yml),
 * before the new app starts. Without it, a row that only has the English text
 * would be shown in English on the Portuguese pages: the database wins over the
 * seed, in either language (ADR 0003).
 *
 * Idempotent: only empty columns are written, so a second run changes nothing
 * and an edit made in the backoffice stays. Everything happens in one
 * transaction. Rows that are not in `lib/projects.ts` are not touched.
 *
 *   pnpm db:fill-project-text            (local)
 *   docker compose -f docker-compose.prod.yml run --rm --entrypoint sh migrate -c "pnpm db:fill-project-text"
 */
import { PrismaClient } from "@prisma/client";
import { divergentText, missingText } from "../src/lib/project-seed";
import { projects } from "../src/lib/projects";

const db = new PrismaClient();

async function main() {
  await db.$transaction(async (tx) => {
    const rows = await tx.project.findMany({ where: { slug: { in: projects.map((p) => p.slug) } } });
    const withCase = (await tx.project.count({ where: { casePosition: { not: null } } })) === 0;
    let filled = 0;

    for (const row of rows) {
      const data = missingText(row.slug, row, { withCase });
      const columns = Object.keys(data);
      if (columns.length > 0) {
        await tx.project.update({ where: { id: row.id }, data });
        filled += 1;
        console.log(`[fill-project-text] ${row.slug}: ${columns.join(", ")}`);
      }
      const kept = divergentText(row.slug, row);
      if (kept.length > 0) {
        console.log(`[fill-project-text] ${row.slug}: kept, differs from the seed: ${kept.join(", ")}`);
      }
    }

    const absent = projects.length - rows.length;
    console.log(
      `[fill-project-text] ${filled} of ${rows.length} project(s) filled` +
        (absent > 0 ? `; ${absent} from the seed are not in the database (pnpm db:sync-projects)` : ""),
    );
  }, { timeout: 30_000 });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
