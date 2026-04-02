DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'IssueStatus' AND e.enumlabel = 'DONE'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'IssueStatus' AND e.enumlabel = 'CLOSED'
  ) THEN
    ALTER TYPE "IssueStatus" RENAME VALUE 'DONE' TO 'CLOSED';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'IssueStatus' AND e.enumlabel = 'REJECTED'
  ) THEN
    ALTER TYPE "IssueStatus" ADD VALUE 'REJECTED';
  END IF;
END $$;
