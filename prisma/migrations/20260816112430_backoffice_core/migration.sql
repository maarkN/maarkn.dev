-- CreateEnum
CREATE TYPE "visibility" AS ENUM ('private', 'public');

-- CreateEnum
CREATE TYPE "funnel_stage" AS ENUM ('radar', 'shortlisted', 'package_drafting', 'package_ready', 'awaiting_my_send', 'ready', 'applied', 'recruiter_contact', 'screening', 'assessment', 'technical_challenge', 'interview', 'final_interview', 'references', 'offer', 'accepted', 'rejected', 'withdrawn', 'no_response', 'ghosted', 'skipped');

-- CreateEnum
CREATE TYPE "sponsorship_signal" AS ENUM ('explicit_support', 'silent', 'requires_authorization', 'explicit_no_sponsorship', 'requires_citizenship', 'country_residency_required', 'not_applicable_b2b', 'newcomer_friendly');

-- CreateEnum
CREATE TYPE "doc_kind" AS ENUM ('cv', 'cover_letter', 'job_data', 'job_info', 'notes', 'email', 'screening_answers', 'recruiter_reply', 'challenge_prep', 'practice', 'english_eval_script', 'mini_spec');

-- CreateEnum
CREATE TYPE "coverage_level" AS ENUM ('strong', 'has', 'shallow', 'gap', 'advantage');

-- CreateEnum
CREATE TYPE "source_generation" AS ENUM ('jul-2026', 'ago-2026');

-- CreateEnum
CREATE TYPE "event_direction" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "bullet_layer" AS ENUM ('dossier', 'linkedin_strider', 'cv_master_xyz');

-- CreateEnum
CREATE TYPE "template_family" AS ENUM ('north_america', 'europe');

-- AlterTable
ALTER TABLE "KnowledgeChunk" ADD COLUMN     "contentSha256" TEXT,
ADD COLUMN     "embeddedAt" TIMESTAMP(3),
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "entityType" TEXT,
ADD COLUMN     "syncRunId" TEXT,
ADD COLUMN     "visibility" "visibility" NOT NULL DEFAULT 'private';

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "apiKeyId" TEXT,
    "toolCalls" INTEGER NOT NULL DEFAULT 0,
    "filesSeen" INTEGER NOT NULL DEFAULT 0,
    "filesSent" INTEGER NOT NULL DEFAULT 0,
    "entitiesWritten" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "revertedAt" TIMESTAMP(3),

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "contentSha256" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "embeddedAt" TIMESTAMP(3),
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityType" TEXT,
    "entityId" TEXT,
    "lastSyncRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provenance" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT,
    "sourcePath" TEXT,
    "sourceGeneration" "source_generation",
    "mcpTool" TEXT,
    "apiKeyId" TEXT,
    "syncRunId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Provenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "folderName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicName" TEXT,
    "ndaProtected" BOOLEAN NOT NULL DEFAULT false,
    "website" TEXT,
    "careersUrl" TEXT,
    "linkedinUrl" TEXT,
    "country" TEXT,
    "city" TEXT,
    "market" TEXT,
    "industry" TEXT,
    "sizeBucket" TEXT,
    "vendorCompanyId" TEXT,
    "notesMd" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "contentSha256" TEXT,
    "sourceGeneration" "source_generation",
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "seniority" TEXT,
    "market" TEXT,
    "locationText" TEXT,
    "workMode" TEXT,
    "employmentType" TEXT,
    "salaryText" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "currency" TEXT,
    "sponsorship" "sponsorship_signal" NOT NULL DEFAULT 'silent',
    "descriptionMd" TEXT,
    "requirementsMd" TEXT,
    "postedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER,
    "fitScore" INTEGER,
    "notesMd" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "contentSha256" TEXT,
    "sourceGeneration" "source_generation",
    "embeddedAt" TIMESTAMP(3),
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTech" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "tech" TEXT NOT NULL,
    "skillSlug" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "yearsRequired" INTEGER,
    "rank" INTEGER,

    CONSTRAINT "JobTech_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "folderName" TEXT NOT NULL,
    "jobId" TEXT,
    "companyId" TEXT,
    "stage" "funnel_stage" NOT NULL DEFAULT 'radar',
    "packageStatus" TEXT,
    "roleTitle" TEXT,
    "market" TEXT,
    "sponsorship" "sponsorship_signal",
    "priority" INTEGER,
    "source" TEXT,
    "appliedAt" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "outcomeReason" TEXT,
    "targetSalary" TEXT,
    "summaryMd" TEXT,
    "notesMd" TEXT,
    "resumeTemplateId" TEXT,
    "legacyJobApplicationId" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "contentSha256" TEXT,
    "sourceGeneration" "source_generation",
    "embeddedAt" TIMESTAMP(3),
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "applicationId" TEXT,
    "kind" "doc_kind" NOT NULL,
    "title" TEXT,
    "language" TEXT,
    "status" TEXT,
    "contentMd" TEXT,
    "wordCount" INTEGER,
    "sentAt" TIMESTAMP(3),
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "contentSha256" TEXT,
    "sourceGeneration" "source_generation",
    "embeddedAt" TIMESTAMP(3),
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "documentId" TEXT,
    "applicationId" TEXT,
    "kind" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "contentStored" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3),
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "applicationId" TEXT,
    "name" TEXT NOT NULL,
    "roleTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "timezone" TEXT,
    "channel" TEXT,
    "notesMd" TEXT,
    "sourceKey" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationEvent" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "direction" "event_direction",
    "fromStage" "funnel_stage",
    "toStage" "funnel_stage",
    "channel" TEXT,
    "subject" TEXT,
    "bodyMd" TEXT,
    "contactId" TEXT,
    "documentId" TEXT,
    "sourceKey" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "round" INTEGER,
    "kind" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "mode" TEXT,
    "timezone" TEXT,
    "interviewers" TEXT[],
    "contactId" TEXT,
    "prepMd" TEXT,
    "notesMd" TEXT,
    "outcome" TEXT,
    "sourceKey" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningQuestion" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "jobId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "language" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sourceKey" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreeningQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementCoverage" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "jobId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "requirement" TEXT NOT NULL,
    "requirementKey" TEXT NOT NULL,
    "coverage" "coverage_level" NOT NULL,
    "evidenceMd" TEXT,
    "experienceId" TEXT,
    "careerProjectId" TEXT,
    "skillId" TEXT,
    "sourceKey" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HonestyNote" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "experienceId" TEXT,
    "careerProjectId" TEXT,
    "ruleCode" TEXT,
    "scope" TEXT,
    "noteMd" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'blocking',
    "sourceKey" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HonestyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "groupLabel" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "sourceKey" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadarScan" (
    "id" TEXT NOT NULL,
    "scanKey" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL,
    "totalFound" INTEGER NOT NULL DEFAULT 0,
    "kept" INTEGER NOT NULL DEFAULT 0,
    "eliminated" INTEGER NOT NULL DEFAULT 0,
    "notesMd" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "contentSha256" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadarScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadarScoringRule" (
    "id" TEXT NOT NULL,
    "radarScanId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'boost',
    "weight" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadarScoringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadarHit" (
    "id" TEXT NOT NULL,
    "radarScanId" TEXT NOT NULL,
    "jobId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "title" TEXT,
    "companyName" TEXT,
    "score" INTEGER,
    "rank" INTEGER,
    "verdict" TEXT,
    "eliminationReason" TEXT,
    "sponsorship" "sponsorship_signal",
    "notesMd" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RadarHit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DescriptionVerification" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "applicationId" TEXT,
    "sourceUrl" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verdict" TEXT NOT NULL,
    "method" TEXT,
    "checkedFields" TEXT[],
    "discrepancyMd" TEXT,
    "sourceKey" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DescriptionVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryExpectation" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'year',
    "contractType" TEXT,
    "target" INTEGER,
    "floor" INTEGER,
    "note" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryExpectation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalReference" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "companyName" TEXT,
    "roleTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "language" TEXT,
    "canContact" BOOLEAN NOT NULL DEFAULT false,
    "noteMd" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FramingRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ruleMd" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'blocking',
    "scope" TEXT NOT NULL DEFAULT 'all',
    "forbiddenPatterns" TEXT[],
    "canonicalText" TEXT,
    "examplesMd" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FramingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "companyId" TEXT,
    "publicName" TEXT NOT NULL,
    "realName" TEXT,
    "roleTitle" TEXT NOT NULL,
    "roleTitleEn" TEXT,
    "employmentType" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "current" BOOLEAN NOT NULL DEFAULT false,
    "locationText" TEXT,
    "market" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "summaryPt" TEXT,
    "summaryEn" TEXT,
    "dossierPtMd" TEXT,
    "dossierEnMd" TEXT,
    "linkedinSummaryEn" TEXT,
    "metricsMd" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "contentSha256" TEXT,
    "sourceGeneration" "source_generation",
    "embeddedAt" TIMESTAMP(3),
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerProject" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publicName" TEXT NOT NULL,
    "realName" TEXT,
    "clientCompanyId" TEXT,
    "experienceId" TEXT,
    "portfolioProjectId" TEXT,
    "roleMd" TEXT,
    "summaryPt" TEXT,
    "summaryEn" TEXT,
    "dossierPtMd" TEXT,
    "dossierEnMd" TEXT,
    "metricsMd" TEXT,
    "techStack" TEXT[],
    "repoUrl" TEXT,
    "demoUrl" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "ndaProtected" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "contentSha256" TEXT,
    "sourceGeneration" "source_generation",
    "embeddedAt" TIMESTAMP(3),
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeBullet" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT,
    "careerProjectId" TEXT,
    "layer" "bullet_layer" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "xAccomplished" TEXT,
    "yMeasuredBy" TEXT,
    "zByDoing" TEXT,
    "metric" TEXT,
    "metricConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "keywords" TEXT[],
    "sourceKey" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeBullet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'tool',
    "level" TEXT,
    "yearsUsed" DOUBLE PRECISION,
    "lastUsedYear" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "anchorRank" INTEGER,
    "aliases" TEXT[],
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "family" "template_family" NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en-US',
    "country" TEXT,
    "htmlTemplate" TEXT,
    "cssTemplate" TEXT,
    "workAuthLineB2b" TEXT,
    "workAuthLineRelocation" TEXT,
    "atsNotesMd" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedResume" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "jobId" TEXT,
    "templateId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en-US',
    "kind" TEXT NOT NULL DEFAULT 'resume',
    "contentMd" TEXT,
    "contentHtml" TEXT,
    "pdfPath" TEXT,
    "docxPath" TEXT,
    "model" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "answerTokens" INTEGER NOT NULL DEFAULT 0,
    "keywordMatch" DOUBLE PRECISION,
    "validationPassed" BOOLEAN NOT NULL DEFAULT false,
    "violations" TEXT[],
    "validationReport" JSONB,
    "sentAt" TIMESTAMP(3),
    "sourceKey" TEXT,
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedResume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titlePt" TEXT NOT NULL,
    "titleEn" TEXT,
    "excerptPt" TEXT,
    "excerptEn" TEXT,
    "bodyPtMd" TEXT,
    "bodyEnMd" TEXT,
    "coverImage" TEXT,
    "tags" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "visibility" "visibility" NOT NULL DEFAULT 'private',
    "sourcePath" TEXT,
    "contentSha256" TEXT,
    "embeddedAt" TIMESTAMP(3),
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncRunId" TEXT,
    "lastMcpTool" TEXT,
    "lastApiKeyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ExperienceToSkill" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ExperienceToSkill_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CareerProjectToSkill" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CareerProjectToSkill_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "SyncRun_startedAt_idx" ON "SyncRun"("startedAt");

-- CreateIndex
CREATE INDEX "SyncRun_status_idx" ON "SyncRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SyncState_sourcePath_key" ON "SyncState"("sourcePath");

-- CreateIndex
CREATE INDEX "SyncState_lastSeenAt_idx" ON "SyncState"("lastSeenAt");

-- CreateIndex
CREATE INDEX "SyncState_entityType_entityId_idx" ON "SyncState"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SyncState_lastSyncRunId_idx" ON "SyncState"("lastSyncRunId");

-- CreateIndex
CREATE INDEX "Provenance_entityType_entityId_idx" ON "Provenance"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Provenance_syncRunId_idx" ON "Provenance"("syncRunId");

-- CreateIndex
CREATE INDEX "Provenance_sourcePath_idx" ON "Provenance"("sourcePath");

-- CreateIndex
CREATE INDEX "Provenance_recordedAt_idx" ON "Provenance"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Company_folderName_key" ON "Company"("folderName");

-- CreateIndex
CREATE INDEX "Company_market_idx" ON "Company"("market");

-- CreateIndex
CREATE INDEX "Company_visibility_idx" ON "Company"("visibility");

-- CreateIndex
CREATE INDEX "Company_vendorCompanyId_idx" ON "Company"("vendorCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_sourceUrl_key" ON "Job"("sourceUrl");

-- CreateIndex
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

-- CreateIndex
CREATE INDEX "Job_sponsorship_idx" ON "Job"("sponsorship");

-- CreateIndex
CREATE INDEX "Job_market_idx" ON "Job"("market");

-- CreateIndex
CREATE INDEX "Job_active_idx" ON "Job"("active");

-- CreateIndex
CREATE INDEX "Job_visibility_idx" ON "Job"("visibility");

-- CreateIndex
CREATE INDEX "JobTech_skillSlug_idx" ON "JobTech"("skillSlug");

-- CreateIndex
CREATE UNIQUE INDEX "JobTech_jobId_tech_key" ON "JobTech"("jobId", "tech");

-- CreateIndex
CREATE UNIQUE INDEX "Application_folderName_key" ON "Application"("folderName");

-- CreateIndex
CREATE INDEX "Application_stage_idx" ON "Application"("stage");

-- CreateIndex
CREATE INDEX "Application_companyId_idx" ON "Application"("companyId");

-- CreateIndex
CREATE INDEX "Application_jobId_idx" ON "Application"("jobId");

-- CreateIndex
CREATE INDEX "Application_sponsorship_idx" ON "Application"("sponsorship");

-- CreateIndex
CREATE INDEX "Application_market_idx" ON "Application"("market");

-- CreateIndex
CREATE INDEX "Application_visibility_idx" ON "Application"("visibility");

-- CreateIndex
CREATE INDEX "Application_legacyJobApplicationId_idx" ON "Application"("legacyJobApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_filePath_key" ON "Document"("filePath");

-- CreateIndex
CREATE INDEX "Document_applicationId_idx" ON "Document"("applicationId");

-- CreateIndex
CREATE INDEX "Document_kind_idx" ON "Document"("kind");

-- CreateIndex
CREATE INDEX "Document_visibility_idx" ON "Document"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "Artifact_path_key" ON "Artifact"("path");

-- CreateIndex
CREATE INDEX "Artifact_applicationId_idx" ON "Artifact"("applicationId");

-- CreateIndex
CREATE INDEX "Artifact_documentId_idx" ON "Artifact"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_sourceKey_key" ON "Contact"("sourceKey");

-- CreateIndex
CREATE INDEX "Contact_applicationId_idx" ON "Contact"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_companyId_name_key" ON "Contact"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationEvent_sourceKey_key" ON "ApplicationEvent"("sourceKey");

-- CreateIndex
CREATE INDEX "ApplicationEvent_applicationId_occurredAt_idx" ON "ApplicationEvent"("applicationId", "occurredAt");

-- CreateIndex
CREATE INDEX "ApplicationEvent_type_idx" ON "ApplicationEvent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Interview_sourceKey_key" ON "Interview"("sourceKey");

-- CreateIndex
CREATE INDEX "Interview_applicationId_idx" ON "Interview"("applicationId");

-- CreateIndex
CREATE INDEX "Interview_scheduledAt_idx" ON "Interview"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningQuestion_sourceKey_key" ON "ScreeningQuestion"("sourceKey");

-- CreateIndex
CREATE INDEX "ScreeningQuestion_jobId_idx" ON "ScreeningQuestion"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "ScreeningQuestion_applicationId_orderIndex_key" ON "ScreeningQuestion"("applicationId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementCoverage_sourceKey_key" ON "RequirementCoverage"("sourceKey");

-- CreateIndex
CREATE INDEX "RequirementCoverage_jobId_idx" ON "RequirementCoverage"("jobId");

-- CreateIndex
CREATE INDEX "RequirementCoverage_coverage_idx" ON "RequirementCoverage"("coverage");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementCoverage_applicationId_requirementKey_key" ON "RequirementCoverage"("applicationId", "requirementKey");

-- CreateIndex
CREATE UNIQUE INDEX "HonestyNote_sourceKey_key" ON "HonestyNote"("sourceKey");

-- CreateIndex
CREATE INDEX "HonestyNote_applicationId_idx" ON "HonestyNote"("applicationId");

-- CreateIndex
CREATE INDEX "HonestyNote_ruleCode_idx" ON "HonestyNote"("ruleCode");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItem_sourceKey_key" ON "ChecklistItem"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItem_applicationId_orderIndex_key" ON "ChecklistItem"("applicationId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "RadarScan_scanKey_key" ON "RadarScan"("scanKey");

-- CreateIndex
CREATE UNIQUE INDEX "RadarScoringRule_radarScanId_code_key" ON "RadarScoringRule"("radarScanId", "code");

-- CreateIndex
CREATE INDEX "RadarHit_jobId_idx" ON "RadarHit"("jobId");

-- CreateIndex
CREATE INDEX "RadarHit_verdict_idx" ON "RadarHit"("verdict");

-- CreateIndex
CREATE UNIQUE INDEX "RadarHit_radarScanId_sourceUrl_key" ON "RadarHit"("radarScanId", "sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "DescriptionVerification_sourceKey_key" ON "DescriptionVerification"("sourceKey");

-- CreateIndex
CREATE INDEX "DescriptionVerification_jobId_idx" ON "DescriptionVerification"("jobId");

-- CreateIndex
CREATE INDEX "DescriptionVerification_applicationId_idx" ON "DescriptionVerification"("applicationId");

-- CreateIndex
CREATE INDEX "DescriptionVerification_verdict_idx" ON "DescriptionVerification"("verdict");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryExpectation_key_key" ON "SalaryExpectation"("key");

-- CreateIndex
CREATE INDEX "SalaryExpectation_market_idx" ON "SalaryExpectation"("market");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalReference_slug_key" ON "ProfessionalReference"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FramingRule_code_key" ON "FramingRule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Experience_slug_key" ON "Experience"("slug");

-- CreateIndex
CREATE INDEX "Experience_companyId_idx" ON "Experience"("companyId");

-- CreateIndex
CREATE INDEX "Experience_visibility_idx" ON "Experience"("visibility");

-- CreateIndex
CREATE INDEX "Experience_orderIndex_idx" ON "Experience"("orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "CareerProject_slug_key" ON "CareerProject"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CareerProject_portfolioProjectId_key" ON "CareerProject"("portfolioProjectId");

-- CreateIndex
CREATE INDEX "CareerProject_experienceId_idx" ON "CareerProject"("experienceId");

-- CreateIndex
CREATE INDEX "CareerProject_clientCompanyId_idx" ON "CareerProject"("clientCompanyId");

-- CreateIndex
CREATE INDEX "CareerProject_visibility_idx" ON "CareerProject"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeBullet_sourceKey_key" ON "ResumeBullet"("sourceKey");

-- CreateIndex
CREATE INDEX "ResumeBullet_experienceId_idx" ON "ResumeBullet"("experienceId");

-- CreateIndex
CREATE INDEX "ResumeBullet_careerProjectId_idx" ON "ResumeBullet"("careerProjectId");

-- CreateIndex
CREATE INDEX "ResumeBullet_layer_idx" ON "ResumeBullet"("layer");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "Skill_category_idx" ON "Skill"("category");

-- CreateIndex
CREATE INDEX "Skill_anchorRank_idx" ON "Skill"("anchorRank");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeTemplate_key_key" ON "ResumeTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedResume_sourceKey_key" ON "GeneratedResume"("sourceKey");

-- CreateIndex
CREATE INDEX "GeneratedResume_applicationId_idx" ON "GeneratedResume"("applicationId");

-- CreateIndex
CREATE INDEX "GeneratedResume_templateId_idx" ON "GeneratedResume"("templateId");

-- CreateIndex
CREATE INDEX "GeneratedResume_validationPassed_idx" ON "GeneratedResume"("validationPassed");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Post_visibility_idx" ON "Post"("visibility");

-- CreateIndex
CREATE INDEX "_ExperienceToSkill_B_index" ON "_ExperienceToSkill"("B");

-- CreateIndex
CREATE INDEX "_CareerProjectToSkill_B_index" ON "_CareerProjectToSkill"("B");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_visibility_idx" ON "KnowledgeChunk"("visibility");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_entityType_entityId_idx" ON "KnowledgeChunk"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "SyncState" ADD CONSTRAINT "SyncState_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provenance" ADD CONSTRAINT "Provenance_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "SyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_vendorCompanyId_fkey" FOREIGN KEY ("vendorCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTech" ADD CONSTRAINT "JobTech_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_resumeTemplateId_fkey" FOREIGN KEY ("resumeTemplateId") REFERENCES "ResumeTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationEvent" ADD CONSTRAINT "ApplicationEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningQuestion" ADD CONSTRAINT "ScreeningQuestion_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningQuestion" ADD CONSTRAINT "ScreeningQuestion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementCoverage" ADD CONSTRAINT "RequirementCoverage_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementCoverage" ADD CONSTRAINT "RequirementCoverage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementCoverage" ADD CONSTRAINT "RequirementCoverage_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementCoverage" ADD CONSTRAINT "RequirementCoverage_careerProjectId_fkey" FOREIGN KEY ("careerProjectId") REFERENCES "CareerProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementCoverage" ADD CONSTRAINT "RequirementCoverage_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HonestyNote" ADD CONSTRAINT "HonestyNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HonestyNote" ADD CONSTRAINT "HonestyNote_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HonestyNote" ADD CONSTRAINT "HonestyNote_careerProjectId_fkey" FOREIGN KEY ("careerProjectId") REFERENCES "CareerProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarScoringRule" ADD CONSTRAINT "RadarScoringRule_radarScanId_fkey" FOREIGN KEY ("radarScanId") REFERENCES "RadarScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarHit" ADD CONSTRAINT "RadarHit_radarScanId_fkey" FOREIGN KEY ("radarScanId") REFERENCES "RadarScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarHit" ADD CONSTRAINT "RadarHit_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionVerification" ADD CONSTRAINT "DescriptionVerification_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionVerification" ADD CONSTRAINT "DescriptionVerification_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerProject" ADD CONSTRAINT "CareerProject_clientCompanyId_fkey" FOREIGN KEY ("clientCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerProject" ADD CONSTRAINT "CareerProject_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerProject" ADD CONSTRAINT "CareerProject_portfolioProjectId_fkey" FOREIGN KEY ("portfolioProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeBullet" ADD CONSTRAINT "ResumeBullet_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeBullet" ADD CONSTRAINT "ResumeBullet_careerProjectId_fkey" FOREIGN KEY ("careerProjectId") REFERENCES "CareerProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedResume" ADD CONSTRAINT "GeneratedResume_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedResume" ADD CONSTRAINT "GeneratedResume_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedResume" ADD CONSTRAINT "GeneratedResume_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ResumeTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExperienceToSkill" ADD CONSTRAINT "_ExperienceToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExperienceToSkill" ADD CONSTRAINT "_ExperienceToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CareerProjectToSkill" ADD CONSTRAINT "_CareerProjectToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "CareerProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CareerProjectToSkill" ADD CONSTRAINT "_CareerProjectToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================================================================
-- F1 — enforcement por SCHEMA (escrito a mao, nao gerado pelo Prisma)
-- ---------------------------------------------------------------------------
-- Prisma nao expressa CHECK constraint. Estas regras existem porque a defesa
-- contra vazamento de dado sensivel nao pode depender de instrucao de prompt
-- nem de disciplina de codigo: o MCP e escrito por um agente nao deterministico
-- e o repositorio e publico. Prisma ignora CHECKs na deteccao de drift, entao
-- este bloco sobrevive a `prisma migrate dev` futuros.
-- ===========================================================================

-- 1) Tabelas que NUNCA podem alimentar o indice publico.
--    Contact e ProfessionalReference: PII de terceiros (telefone/e-mail).
--    SalaryExpectation: pisos salariais. FramingRule/HonestyNote: as regras de
--    enquadramento — vazar a lista revela exatamente o que se esta omitindo.
ALTER TABLE "Contact"
  ADD CONSTRAINT "Contact_visibility_private_only"
  CHECK ("visibility" = 'private');

ALTER TABLE "ProfessionalReference"
  ADD CONSTRAINT "ProfessionalReference_visibility_private_only"
  CHECK ("visibility" = 'private');

ALTER TABLE "SalaryExpectation"
  ADD CONSTRAINT "SalaryExpectation_visibility_private_only"
  CHECK ("visibility" = 'private');

ALTER TABLE "FramingRule"
  ADD CONSTRAINT "FramingRule_visibility_private_only"
  CHECK ("visibility" = 'private');

ALTER TABLE "HonestyNote"
  ADD CONSTRAINT "HonestyNote_visibility_private_only"
  CHECK ("visibility" = 'private');

-- 2) Confidencialidade estrutural: `realName` e INELEGIVEL para o indice
--    publico. Uma linha so pode ser promovida a `public` se carregar um alias
--    anonimizado distinto do nome real e nao estiver marcada como NDA.
ALTER TABLE "CareerProject"
  ADD CONSTRAINT "CareerProject_public_requires_alias"
  CHECK (
    "visibility" = 'private'
    OR ("ndaProtected" = false AND ("realName" IS NULL OR "publicName" <> "realName"))
  );

ALTER TABLE "Experience"
  ADD CONSTRAINT "Experience_public_requires_alias"
  CHECK (
    "visibility" = 'private'
    OR ("realName" IS NULL OR "publicName" <> "realName")
  );

ALTER TABLE "Company"
  ADD CONSTRAINT "Company_public_requires_no_nda"
  CHECK (
    "visibility" = 'private'
    OR ("ndaProtected" = false AND "publicName" IS NOT NULL AND "publicName" <> "name")
  );

-- 3) Backfill do RAG existente. `KnowledgeChunk.visibility` nasce `private`
--    (regra do F1), mas as linhas que ja estavam na tabela vem de
--    `app/knowledge/**` — corpus curado que o chat publico ja serve a
--    visitantes anonimos hoje. Marca-las como `public` preserva o
--    comportamento atual; qualquer chunk novo (MCP) nasce privado.
--    ATENCAO F3: `scripts/ingest-knowledge.ts` faz DELETE + INSERT sem a
--    coluna `visibility`, entao a proxima ingestao recria tudo como `private`.
--    O ingester PRECISA passar a gravar `visibility` explicitamente.
UPDATE "KnowledgeChunk" SET "visibility" = 'public';
