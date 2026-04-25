-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Project" ("accentFrom", "accentTo", "caseUrl", "category", "createdAt", "demoUrl", "description", "featured", "featuresJson", "id", "monogram", "name", "repoUrl", "role", "slug", "stackJson", "status", "tagline", "updatedAt", "year") SELECT "accentFrom", "accentTo", "caseUrl", "category", "createdAt", "demoUrl", "description", "featured", "featuresJson", "id", "monogram", "name", "repoUrl", "role", "slug", "stackJson", "status", "tagline", "updatedAt", "year" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_featured_idx" ON "Project"("featured");
CREATE INDEX "Project_category_idx" ON "Project"("category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
