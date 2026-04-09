DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ProjectRole'
  ) THEN
    CREATE TYPE "ProjectRole" AS ENUM ('ADMIN', 'QA', 'DEVELOPER', 'VIEWER');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ProjectMember" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "ProjectRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectMember_projectId_userId_key"
  ON "ProjectMember"("projectId", "userId");

CREATE INDEX IF NOT EXISTS "ProjectMember_projectId_idx"
  ON "ProjectMember"("projectId");

CREATE INDEX IF NOT EXISTS "ProjectMember_userId_idx"
  ON "ProjectMember"("userId");

CREATE INDEX IF NOT EXISTS "ProjectMember_projectId_role_idx"
  ON "ProjectMember"("projectId", "role");

CREATE INDEX IF NOT EXISTS "Issue_projectId_status_createdAt_idx"
  ON "Issue"("projectId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Issue_projectId_deletedAt_createdAt_idx"
  ON "Issue"("projectId", "deletedAt", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ProjectMember_projectId_fkey'
  ) THEN
    ALTER TABLE "ProjectMember"
      ADD CONSTRAINT "ProjectMember_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ProjectMember_userId_fkey'
  ) THEN
    ALTER TABLE "ProjectMember"
      ADD CONSTRAINT "ProjectMember_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "ProjectMember" (
  "id",
  "projectId",
  "userId",
  "role",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(
    concat(
      p."id",
      ':',
      u."id",
      ':',
      clock_timestamp()::text,
      ':',
      random()::text
    )
  ) AS "id",
  p."id",
  u."id",
  CASE u."role"
    WHEN 'ADMIN' THEN 'ADMIN'::"ProjectRole"
    WHEN 'QA' THEN 'QA'::"ProjectRole"
    ELSE 'DEVELOPER'::"ProjectRole"
  END AS "role",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Project" p
CROSS JOIN "User" u
WHERE p."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "ProjectMember" pm
    WHERE pm."projectId" = p."id"
      AND pm."userId" = u."id"
  );
