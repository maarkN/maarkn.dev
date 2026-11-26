-- The database becomes the source of the projects' text (ADR 0003): one column
-- per language, the success case, and a gallery. Additive only: the version of
-- the app that does not know these columns keeps working on this schema.
--
-- Nothing is filled here. The text comes from the dictionaries through
-- `scripts/fill-project-text.ts`, which the `migrate` service runs right after
-- `prisma migrate deploy` (docker-compose.prod.yml).

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "casePosition" INTEGER,
ADD COLUMN     "caseProblemEn" TEXT,
ADD COLUMN     "caseProblemPt" TEXT,
ADD COLUMN     "caseResultEn" TEXT,
ADD COLUMN     "caseResultPt" TEXT,
ADD COLUMN     "caseWorkEn" TEXT,
ADD COLUMN     "caseWorkPt" TEXT,
ADD COLUMN     "descriptionPt" TEXT,
ADD COLUMN     "featuresPtJson" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "rolePt" TEXT,
ADD COLUMN     "taglinePt" TEXT;

-- CreateTable
CREATE TABLE "ProjectImage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "captionEn" TEXT,
    "captionPt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectImage_projectId_position_key" ON "ProjectImage"("projectId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Project_casePosition_key" ON "Project"("casePosition");

-- AddForeignKey
ALTER TABLE "ProjectImage" ADD CONSTRAINT "ProjectImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- At most three success cases: three positions, each used once (the unique
-- index above). Not expressible in the Prisma schema, so it only lives here.
ALTER TABLE "Project" ADD CONSTRAINT "Project_casePosition_range"
  CHECK ("casePosition" BETWEEN 1 AND 3);

-- A success case tells problem, work and result in both languages. `coalesce`
-- is load-bearing: a CHECK passes on NULL, so `btrim(NULL) <> ''` would let an
-- empty case through.
ALTER TABLE "Project" ADD CONSTRAINT "Project_casePosition_needs_text"
  CHECK (
    "casePosition" IS NULL
    OR (
      coalesce(btrim("caseProblemEn", E' \t\r\n'), '') <> ''
      AND coalesce(btrim("caseProblemPt", E' \t\r\n'), '') <> ''
      AND coalesce(btrim("caseWorkEn", E' \t\r\n'), '') <> ''
      AND coalesce(btrim("caseWorkPt", E' \t\r\n'), '') <> ''
      AND coalesce(btrim("caseResultEn", E' \t\r\n'), '') <> ''
      AND coalesce(btrim("caseResultPt", E' \t\r\n'), '') <> ''
    )
  );
