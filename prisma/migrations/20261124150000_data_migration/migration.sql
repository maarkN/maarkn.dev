-- Which one-off content scripts already ran on this database. Prisma keeps the
-- same record for SQL migrations; this one is for the scripts that need the
-- dictionaries, and so cannot be SQL. Additive only.

-- CreateTable
CREATE TABLE "DataMigration" (
    "name" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataMigration_pkey" PRIMARY KEY ("name")
);

-- `fill-project-text` completes rows written before the `portfolio_content`
-- migration. A database without projects has none, and every row created from
-- here on is already complete: an empty field in it was left empty by someone.
INSERT INTO "DataMigration" ("name")
SELECT 'fill-project-text'
WHERE NOT EXISTS (SELECT 1 FROM "Project");
