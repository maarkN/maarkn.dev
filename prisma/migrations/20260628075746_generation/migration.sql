-- CreateTable
CREATE TABLE "Generation" (
    "id" TEXT NOT NULL,
    "company" TEXT,
    "roleTitle" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "jobDescription" TEXT NOT NULL,
    "resume" TEXT NOT NULL,
    "coverLetter" TEXT NOT NULL,
    "screeningAnswers" TEXT NOT NULL,
    "sourcesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Generation_createdAt_idx" ON "Generation"("createdAt");
