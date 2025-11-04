/*
  Warnings:

  - Made the column `createdAt` on table `UserStoryTag` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "EstimationSession" ADD COLUMN     "currentRound" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "UserStory" ALTER COLUMN "priority" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserStoryTag" ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);
