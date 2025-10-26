-- Convert priority column to integer, defaulting invalid entries to 0
ALTER TABLE "public"."UserStory"
  ALTER COLUMN "priority" TYPE INT USING
    CASE
      WHEN trim("priority") ~ '^[0-9]+$' THEN ("priority")::INT
      ELSE 0
    END,
  ALTER COLUMN "priority" SET DEFAULT 0;

-- Create table for user story tags
CREATE TABLE "public"."UserStoryTag" (
  "id" UUID PRIMARY KEY,
  "storyId" UUID NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT now()
);

ALTER TABLE "public"."UserStoryTag"
  ADD CONSTRAINT "UserStoryTag_storyId_fkey"
  FOREIGN KEY ("storyId")
  REFERENCES "public"."UserStory"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

CREATE UNIQUE INDEX "UserStoryTag_storyId_value_key"
  ON "public"."UserStoryTag"("storyId", "value");

CREATE INDEX "UserStoryTag_value_idx"
  ON "public"."UserStoryTag"("value");
