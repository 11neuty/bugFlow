ALTER TABLE "Project"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Project_deletedAt_idx" ON "Project"("deletedAt");
