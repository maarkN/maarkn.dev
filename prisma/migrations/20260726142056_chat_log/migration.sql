-- CreateTable
CREATE TABLE "ChatLog" (
    "id" TEXT NOT NULL,
    "clientKeyHash" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "model" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "answerTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatLog_createdAt_idx" ON "ChatLog"("createdAt");

-- CreateIndex
CREATE INDEX "ChatLog_clientKeyHash_createdAt_idx" ON "ChatLog"("clientKeyHash", "createdAt");
