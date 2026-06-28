-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'dossier',
    "title" TEXT,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeChunk_source_idx" ON "KnowledgeChunk"("source");
