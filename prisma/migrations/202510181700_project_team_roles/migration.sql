-- Alter table Project to enforce new constraints
ALTER TABLE "public"."Project"
  ALTER COLUMN "qualityCriteria" TYPE TEXT USING "qualityCriteria"::TEXT;

ALTER TABLE "public"."Project"
  ADD CONSTRAINT "Project_name_key" UNIQUE ("name");

-- Create enum for project member roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ProjectMemberRole'
  ) THEN
    CREATE TYPE "ProjectMemberRole" AS ENUM ('PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER');
  END IF;
END$$;

-- Update project members to use the enum column instead of foreign key
ALTER TABLE "public"."ProjectMember"
  DROP CONSTRAINT IF EXISTS "ProjectMember_roleId_fkey";

DROP INDEX IF EXISTS "ProjectMember_roleId_idx";

ALTER TABLE "public"."ProjectMember"
  DROP COLUMN IF EXISTS "roleId";

ALTER TABLE "public"."ProjectMember"
  ADD COLUMN "role" "ProjectMemberRole";

UPDATE "public"."ProjectMember"
  SET "role" = 'DEVELOPER'
  WHERE "role" IS NULL;

ALTER TABLE "public"."ProjectMember"
  ALTER COLUMN "role" SET NOT NULL;
