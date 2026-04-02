ALTER TYPE "IssueStatus" ADD VALUE IF NOT EXISTS 'DONE' BEFORE 'CLOSED';

ALTER TYPE "IssueSeverity" ADD VALUE IF NOT EXISTS 'HIGH' BEFORE 'CRITICAL';

CREATE SEQUENCE IF NOT EXISTS "Issue_issueNumber_seq";

ALTER TABLE "Issue"
ADD COLUMN IF NOT EXISTS "issueNumber" INTEGER;

ALTER TABLE "Issue"
ALTER COLUMN "issueNumber" SET DEFAULT nextval('"Issue_issueNumber_seq"');

WITH numbered AS (
  SELECT "id", nextval('"Issue_issueNumber_seq"') AS next_number
  FROM "Issue"
  WHERE "issueNumber" IS NULL
  ORDER BY "createdAt", "id"
)
UPDATE "Issue" AS issue_row
SET "issueNumber" = numbered.next_number
FROM numbered
WHERE issue_row."id" = numbered."id";

SELECT setval(
  '"Issue_issueNumber_seq"',
  COALESCE((SELECT MAX("issueNumber") FROM "Issue"), 1),
  EXISTS(SELECT 1 FROM "Issue")
);

ALTER TABLE "Issue"
ALTER COLUMN "issueNumber" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Issue_issueNumber_key" ON "Issue"("issueNumber");

CREATE INDEX IF NOT EXISTS "Issue_issueNumber_idx" ON "Issue"("issueNumber");
