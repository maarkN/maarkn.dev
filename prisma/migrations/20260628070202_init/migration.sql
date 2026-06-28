-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'live',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "monogram" TEXT NOT NULL,
    "accentFrom" TEXT NOT NULL,
    "accentTo" TEXT NOT NULL,
    "stackJson" TEXT NOT NULL DEFAULT '[]',
    "repoUrl" TEXT,
    "demoUrl" TEXT,
    "caseUrl" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "role" TEXT,
    "featuresJson" TEXT NOT NULL DEFAULT '[]',
    "sourceVisibility" TEXT NOT NULL DEFAULT 'public',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_featured_idx" ON "Project"("featured");

-- CreateIndex
CREATE INDEX "Project_category_idx" ON "Project"("category");
