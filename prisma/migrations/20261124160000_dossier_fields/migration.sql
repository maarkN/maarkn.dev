-- What the dossier keeps beyond the funnel: the company's text, the project
-- info, the closure reason, and the situation and order of each interview.
--
-- Additive only: the version of the app that does not know these columns keeps
-- working on this schema. What it cannot do is undo what only the new version
-- writes: reopen an application that already has a closure reason, or give a
-- date to an interview (no screen or tool of it does). The CHECKs at the end
-- refuse both.

-- CreateEnum
CREATE TYPE "closure_reason" AS ENUM ('salary', 'visa', 'technical_fit', 'seniority', 'language', 'location', 'job_closed', 'internal_candidate', 'withdrawal', 'not_informed', 'other');

-- CreateEnum
CREATE TYPE "interview_status" AS ENUM ('planned', 'scheduled', 'completed', 'cancelled');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "closureReason" "closure_reason",
ADD COLUMN     "projectInfoMd" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "aboutMd" TEXT;

-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "interview_status" NOT NULL DEFAULT 'planned';

-- The closure reason of existing applications stays empty: `outcomeReason` is
-- free text and nothing in it says which category it is.

-- The situation of existing interviews, from what each row already says. The
-- outcome is never erased, only read:
--   cancelled (written in the outcome) -> cancelled
--   no date                            -> planned
--   date ahead                         -> scheduled
--   date behind, with a result         -> completed
--   date behind, no result             -> scheduled: nothing says it happened
-- A result without a date stays `planned`, because `completed` needs a date.
UPDATE "Interview" SET "status" = (
  CASE
    WHEN lower(btrim(coalesce("outcome", ''))) IN ('cancelled', 'canceled') THEN 'cancelled'
    WHEN "scheduledAt" IS NULL THEN 'planned'
    WHEN "scheduledAt" > (now() AT TIME ZONE 'UTC') THEN 'scheduled'
    WHEN lower(btrim(coalesce("outcome", ''))) NOT IN ('', 'pending') THEN 'completed'
    ELSE 'scheduled'
  END
)::"interview_status";

-- The order of existing interviews inside their application: the round the
-- company gave, then the date, then the order they were registered in.
UPDATE "Interview" i SET "orderIndex" = o."position"
FROM (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "applicationId"
      ORDER BY "round" ASC NULLS LAST, "scheduledAt" ASC NULLS LAST, "createdAt" ASC, "id" ASC
    ) - 1 AS "position"
  FROM "Interview"
) o
WHERE o."id" = i."id";

-- --------------------------------------------------------------------------
-- Prisma does not express CHECK constraints (and ignores them when it looks
-- for drift). The app applies both rules before writing; these hold them
-- against two writers at the same time, `revert_sync_run` and hand-made SQL.
-- --------------------------------------------------------------------------

-- A closure reason only exists in a rejected or withdrawn application.
ALTER TABLE "Application" ADD CONSTRAINT "Application_closureReason_stage"
  CHECK ("closureReason" IS NULL OR "stage" IN ('rejected', 'withdrawn'));

-- Scheduled and completed have a date; planned does not; cancelled may.
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_status_date"
  CHECK (
    CASE "status"
      WHEN 'planned' THEN "scheduledAt" IS NULL
      WHEN 'cancelled' THEN TRUE
      ELSE "scheduledAt" IS NOT NULL
    END
  );
