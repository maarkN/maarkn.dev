-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "role" TEXT,
    "fit" TEXT,
    "source" TEXT NOT NULL DEFAULT 'company_site',
    "status" TEXT NOT NULL DEFAULT 'not_applied',
    "careersUrl" TEXT,
    "jobUrl" TEXT,
    "sponsorsVisa" BOOLEAN NOT NULL DEFAULT false,
    "targetSalary" TEXT,
    "appliedAt" TIMESTAMP(3),
    "followUp" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");

-- CreateIndex
CREATE INDEX "JobApplication_source_idx" ON "JobApplication"("source");
