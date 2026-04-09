ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "username" TEXT;

WITH candidates AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(
        trim(
          BOTH '_'
          FROM regexp_replace(lower("name"), '[^a-z0-9_]+', '_', 'g')
        ),
        ''
      ),
      NULLIF(
        trim(
          BOTH '_'
          FROM regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9_]+', '_', 'g')
        ),
        ''
      ),
      'user'
    ) AS "base"
  FROM "User"
),
ranked AS (
  SELECT
    "id",
    left("base", 24) AS "base",
    row_number() OVER (PARTITION BY "base" ORDER BY "id") AS "row_num"
  FROM candidates
)
UPDATE "User" AS u
SET "username" = CASE
  WHEN ranked."row_num" = 1 THEN ranked."base"
  ELSE left(ranked."base", GREATEST(1, 32 - length('_' || ranked."row_num"::text))) || '_' || ranked."row_num"::text
END
FROM ranked
WHERE u."id" = ranked."id"
  AND (u."username" IS NULL OR btrim(u."username") = '');

ALTER TABLE "User"
  ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key"
  ON "User"("username");

ALTER TABLE "Comment"
  ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_enum
       WHERE enumtypid = to_regtype('"NotificationType"')
         AND enumlabel = 'MENTIONED_IN_COMMENT'
     ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'MENTIONED_IN_COMMENT';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "IssueRelation" (
  "id" TEXT NOT NULL,
  "sourceIssueId" TEXT NOT NULL,
  "targetIssueId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IssueRelation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IssueRelation_sourceIssueId_targetIssueId_type_key"
  ON "IssueRelation"("sourceIssueId", "targetIssueId", "type");

CREATE INDEX IF NOT EXISTS "IssueRelation_sourceIssueId_idx"
  ON "IssueRelation"("sourceIssueId");

CREATE INDEX IF NOT EXISTS "IssueRelation_targetIssueId_idx"
  ON "IssueRelation"("targetIssueId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'IssueRelation_sourceIssueId_fkey'
  ) THEN
    ALTER TABLE "IssueRelation"
      ADD CONSTRAINT "IssueRelation_sourceIssueId_fkey"
      FOREIGN KEY ("sourceIssueId") REFERENCES "Issue"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'IssueRelation_targetIssueId_fkey'
  ) THEN
    ALTER TABLE "IssueRelation"
      ADD CONSTRAINT "IssueRelation_targetIssueId_fkey"
      FOREIGN KEY ("targetIssueId") REFERENCES "Issue"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
