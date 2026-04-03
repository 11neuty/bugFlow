CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- AddColumn
ALTER TABLE "Issue" ADD COLUMN "projectId" TEXT;

-- Seed default project for backwards compatibility
INSERT INTO "Project" ("id", "name", "createdAt")
VALUES (gen_random_uuid()::text, 'Default Project', CURRENT_TIMESTAMP);

-- Backfill existing issues into the default project
UPDATE "Issue"
SET "projectId" = (
    SELECT "id"
    FROM "Project"
    WHERE "name" = 'Default Project'
    LIMIT 1
)
WHERE "projectId" IS NULL;

-- Make project assignment mandatory after backfill
ALTER TABLE "Issue" ALTER COLUMN "projectId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- CreateIndex
CREATE INDEX "Issue_projectId_idx" ON "Issue"("projectId");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
