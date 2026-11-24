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
 * It acts once per database, however many deploys call it: the first run leaves
 * its name in `DataMigration`, in the same transaction, and the next ones stop
 * there. That first run only writes empty columns, so text that is already there
 * stays. Rows that are not in `lib/projects.ts` are not touched.
 *
 * To have it act again on a development database, delete that row.
 *
 *   pnpm db:fill-project-text            (local)
 *   docker compose -f docker-compose.prod.yml run --rm --entrypoint sh migrate -c "pnpm db:fill-project-text"
 */
import { PrismaClient } from "@prisma/client";
import { fillProjectText } from "../src/lib/project-fill";

const db = new PrismaClient();

db.$transaction((tx) => fillProjectText(tx), { timeout: 30_000 })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
