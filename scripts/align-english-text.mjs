/**
 * Once, before the deploy that brings the `portfolio_content` migration (DEPLOY.md
 * §7): writes the English text the site shows into the `Project` table.
 *
 * Until that deploy the dictionary wins over the database, so the English stored
 * for the projects it knows was never on the site and may be older than what is.
 * From that deploy on, it is what visitors read. This replaces it, and only it:
 * `tagline`, `description`, `role` and `featuresJson` of the projects that have
 * an entry in the dictionary. Name, year, status, links and the rest of the row
 * are already public and stay; so do the other projects. Nothing is deleted.
 *
 * It runs inside the image that is live, over stdin, because the dictionary in
 * there is the one being shown. Plain JavaScript, and no import from `src/`, for
 * the same reason. Without `--write` it only lists what would change. It refuses
 * a database that already has the migration: there the text is somebody's edit.
 *
 * The whole sequence, with the dump that comes first, is in DEPLOY.md §7:
 *
 *   docker compose -f docker-compose.prod.yml run --rm -T --entrypoint node migrate \
 *     --input-type=module - [--write] < align-english-text.mjs
 */
import { readFileSync } from "node:fs";
import prisma from "@prisma/client";

const TAG = "[align-english-text]";
const COLUMNS = ["tagline", "description", "role", "featuresJson"];

const write = process.argv.includes("--write");
const { taglines, details } = JSON.parse(readFileSync("src/dictionaries/en.json", "utf8")).projects;

const db = new prisma.PrismaClient();

async function align(tx) {
  const [{ migrated }] = await tx.$queryRaw`
    SELECT count(*) > 0 AS migrated FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Project' AND column_name = 'taglinePt'
  `;
  if (migrated) {
    throw new Error("the database is already the source of the projects' text; edit it in /admin/projects");
  }

  const rows = await tx.project.findMany({
    where: { slug: { in: Object.keys(details) } },
    select: { slug: true, tagline: true, description: true, role: true, featuresJson: true },
    orderBy: { slug: "asc" },
  });
  let count = 0;
  for (const row of rows) {
    const { description, role, features } = details[row.slug];
    const shown = { tagline: taglines[row.slug], description, role, featuresJson: JSON.stringify(features) };
    const stale = COLUMNS.filter((column) => shown[column] !== undefined && row[column] !== shown[column]);
    if (stale.length === 0) continue;
    count += 1;
    console.log(`${TAG} ${row.slug}: ${stale.join(", ")}`);
    if (write) {
      const data = Object.fromEntries(stale.map((column) => [column, shown[column]]));
      // `updateMany`: it does not read the row back.
      await tx.project.updateMany({ where: { slug: row.slug }, data });
    }
  }
  console.log(
    write
      ? `${TAG} ${count} project(s) now say in the database what the site says`
      : `${TAG} ${count} project(s) differ from the site; --write replaces those columns`,
  );
}

try {
  await db.$transaction(align, { timeout: 30_000 });
} catch (err) {
  console.error(`${TAG} ${err.message}`);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
