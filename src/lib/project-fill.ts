import type { Prisma } from "@prisma/client";
import { divergentText, missingText } from "@/lib/project-seed";
import { projects } from "@/lib/projects";

/** Name of this script in the `DataMigration` table. */
export const FILL_PROJECT_TEXT = "fill-project-text";

const TAG = `[${FILL_PROJECT_TEXT}]`;

/**
 * Copies the seed's text into the rows that lack it, once per database. The
 * caller owns the transaction: the record that it ran and what it wrote have to
 * land together.
 *
 * Once, and not "whenever a column is empty": the `migrate` service calls this
 * on every deploy, and after the first one an empty column is a choice. Somebody
 * cleared the field, or took the case down, in the backoffice.
 */
export async function fillProjectText(
  tx: Prisma.TransactionClient,
  log: (line: string) => void = console.log,
): Promise<void> {
  const claim = await tx.dataMigration.createMany({
    data: [{ name: FILL_PROJECT_TEXT }],
    skipDuplicates: true,
  });
  if (claim.count === 0) {
    log(`${TAG} already ran on this database, nothing to do`);
    return;
  }

  const rows = await tx.project.findMany({ where: { slug: { in: projects.map((p) => p.slug) } } });
  const withCase = (await tx.project.count({ where: { casePosition: { not: null } } })) === 0;
  let filled = 0;

  for (const row of rows) {
    const data = missingText(row.slug, row, { withCase });
    const columns = Object.keys(data);
    if (columns.length > 0) {
      await tx.project.update({ where: { id: row.id }, data });
      filled += 1;
      log(`${TAG} ${row.slug}: ${columns.join(", ")}`);
    }
    const kept = divergentText(row.slug, row);
    if (kept.length > 0) {
      log(`${TAG} ${row.slug}: kept, differs from the seed: ${kept.join(", ")}`);
    }
  }

  const absent = projects.length - rows.length;
  log(
    `${TAG} ${filled} of ${rows.length} project(s) filled` +
      (absent > 0 ? `; ${absent} from the seed are not in the database (pnpm db:sync-projects)` : ""),
  );
}
