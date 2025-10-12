-- CreateEnum
CREATE TYPE "public"."ProjectVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."StoryStatus" AS ENUM ('BACKLOG', 'SELECTED', 'IN_PROGRESS', 'TESTING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."EstimationMethod" AS ENUM ('FIBONACCI', 'TSHIRT', 'POWERS_OF_TWO', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."SessionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "public"."ProjectVisibility" NOT NULL DEFAULT 'PRIVATE',
    "productObjective" TEXT,
    "definitionOfDone" TEXT,
    "sprintDuration" INTEGER NOT NULL,
    "qualityCriteria" INTEGER,
    "status" "public"."ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "ownerId" UUID NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectMember" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "permission" JSONB NOT NULL,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserStory" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "asA" TEXT NOT NULL,
    "iWant" TEXT NOT NULL,
    "soThat" TEXT NOT NULL,
    "acceptanceCriteria" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL,
    "businessValue" INTEGER NOT NULL,
    "orderRank" INTEGER NOT NULL,
    "estimateHours" INTEGER NOT NULL,
    "label" INTEGER,
    "status" "public"."StoryStatus" NOT NULL DEFAULT 'BACKLOG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EstimationSession" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "finalEstimation" TEXT,
    "method" "public"."EstimationMethod" NOT NULL,
    "sequence" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storyId" UUID,
    "moderatorId" UUID,
    "isRevealed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EstimationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EstimationVote" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "voteValue" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "justification" TEXT,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimationVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectConfig" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isSystemSetting" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "public"."Project"("code");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "public"."Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_status_visibility_idx" ON "public"."Project"("status", "visibility");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "public"."ProjectMember"("userId");

-- CreateIndex
CREATE INDEX "ProjectMember_roleId_idx" ON "public"."ProjectMember"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "public"."ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "public"."Role"("code");

-- CreateIndex
CREATE INDEX "UserStory_projectId_status_orderRank_idx" ON "public"."UserStory"("projectId", "status", "orderRank");

-- CreateIndex
CREATE UNIQUE INDEX "UserStory_projectId_code_key" ON "public"."UserStory"("projectId", "code");

-- CreateIndex
CREATE INDEX "EstimationSession_projectId_idx" ON "public"."EstimationSession"("projectId");

-- CreateIndex
CREATE INDEX "EstimationSession_moderatorId_idx" ON "public"."EstimationSession"("moderatorId");

-- CreateIndex
CREATE INDEX "EstimationSession_storyId_idx" ON "public"."EstimationSession"("storyId");

-- CreateIndex
CREATE INDEX "EstimationVote_sessionId_idx" ON "public"."EstimationVote"("sessionId");

-- CreateIndex
CREATE INDEX "EstimationVote_userId_idx" ON "public"."EstimationVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EstimationVote_sessionId_userId_roundNumber_key" ON "public"."EstimationVote"("sessionId", "userId", "roundNumber");

-- CreateIndex
CREATE INDEX "ProjectConfig_projectId_key_idx" ON "public"."ProjectConfig"("projectId", "key");

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectMember" ADD CONSTRAINT "ProjectMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Role" ADD CONSTRAINT "Role_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserStory" ADD CONSTRAINT "UserStory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EstimationSession" ADD CONSTRAINT "EstimationSession_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "public"."UserStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EstimationSession" ADD CONSTRAINT "EstimationSession_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EstimationSession" ADD CONSTRAINT "EstimationSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EstimationVote" ADD CONSTRAINT "EstimationVote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."EstimationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EstimationVote" ADD CONSTRAINT "EstimationVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectConfig" ADD CONSTRAINT "ProjectConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
