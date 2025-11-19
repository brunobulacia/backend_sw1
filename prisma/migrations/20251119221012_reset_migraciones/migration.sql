-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('PRODUCT_OWNER', 'SCRUM_MASTER', 'DEVELOPER');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('BACKLOG', 'SELECTED', 'IN_PROGRESS', 'TESTING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EstimationMethod" AS ENUM ('FIBONACCI', 'TSHIRT', 'POWERS_OF_TWO', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "SprintStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'TESTING', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImprovementActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GitHubSyncStatus" AS ENUM ('SUCCESS', 'ERROR', 'RATE_LIMIT');

-- CreateEnum
CREATE TYPE "RefactoringSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RefactoringStatus" AS ENUM ('PENDING', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "MLDataType" AS ENUM ('ASSIGNMENT', 'COMPLETION', 'VELOCITY');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "githubUsername" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "passwordChangedAt" TIMESTAMP(3),
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PRIVATE',
    "productObjective" TEXT,
    "definitionOfDone" TEXT,
    "sprintDuration" INTEGER NOT NULL,
    "qualityCriteria" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "ownerId" UUID NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ProjectMemberRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
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
CREATE TABLE "UserStory" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "sprintId" UUID,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "asA" TEXT NOT NULL,
    "iWant" TEXT NOT NULL,
    "soThat" TEXT NOT NULL,
    "acceptanceCriteria" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL,
    "businessValue" INTEGER NOT NULL,
    "orderRank" INTEGER NOT NULL,
    "estimateHours" INTEGER NOT NULL,
    "label" INTEGER,
    "status" "StoryStatus" NOT NULL DEFAULT 'BACKLOG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStoryTag" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStoryTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimationSession" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "finalEstimation" TEXT,
    "method" "EstimationMethod" NOT NULL,
    "sequence" JSONB NOT NULL,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storyId" UUID,
    "moderatorId" UUID,
    "isRevealed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EstimationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimationVote" (
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
CREATE TABLE "ProjectConfig" (
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

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "requestedById" UUID,
    "requestedIp" TEXT,
    "requestedUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetRequest" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "emailHash" TEXT NOT NULL,
    "requestedIp" TEXT,
    "requestedUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sprint" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" "SprintStatus" NOT NULL DEFAULT 'PLANNED',
    "capacity" INTEGER,
    "plannedVelocity" INTEGER,
    "actualVelocity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "effort" INTEGER NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "assignedToId" UUID,
    "isBug" BOOLEAN NOT NULL DEFAULT false,
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskActivityLog" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyScrum" (
    "id" UUID NOT NULL,
    "sprintId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "whatDidYesterday" TEXT NOT NULL,
    "whatWillDoToday" TEXT NOT NULL,
    "impediments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyScrum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyScrumStory" (
    "id" UUID NOT NULL,
    "dailyScrumId" UUID NOT NULL,
    "storyId" UUID NOT NULL,

    CONSTRAINT "DailyScrumStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BurndownSnapshot" (
    "id" UUID NOT NULL,
    "sprintId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "effortRemaining" INTEGER NOT NULL,
    "effortCompleted" INTEGER NOT NULL,
    "effortCommitted" INTEGER NOT NULL,
    "storiesCompleted" INTEGER NOT NULL,
    "storiesTotal" INTEGER NOT NULL,
    "tasksCompleted" INTEGER NOT NULL,
    "tasksTotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BurndownSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mainBranch" TEXT NOT NULL DEFAULT 'main',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "githubToken" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubCommit" (
    "id" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,
    "sha" TEXT NOT NULL,
    "shortSha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorEmail" TEXT,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "branch" TEXT,
    "url" TEXT NOT NULL,
    "linkedStoryId" UUID,
    "linkedTaskId" UUID,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubCommit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubPullRequest" (
    "id" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "sourceBranch" TEXT NOT NULL,
    "targetBranch" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAtGitHub" TIMESTAMP(3) NOT NULL,
    "closedAtGitHub" TIMESTAMP(3),
    "linkedStoryId" UUID,
    "linkedTaskId" UUID,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubPullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubSyncLog" (
    "id" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "GitHubSyncStatus" NOT NULL,
    "commitsFound" INTEGER NOT NULL DEFAULT 0,
    "prsFound" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintReview" (
    "id" UUID NOT NULL,
    "sprintId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "participants" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "feedbackGeneral" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SprintReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintRetrospective" (
    "id" UUID NOT NULL,
    "sprintId" UUID NOT NULL,
    "whatWentWell" TEXT NOT NULL,
    "whatToImprove" TEXT NOT NULL,
    "whatToStopDoing" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SprintRetrospective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImprovementAction" (
    "id" UUID NOT NULL,
    "retrospectiveId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "responsible" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "ImprovementActionStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImprovementAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeveloperPSPMetrics" (
    "id" UUID NOT NULL,
    "sprintId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksReopened" INTEGER NOT NULL DEFAULT 0,
    "defectsFixed" INTEGER NOT NULL DEFAULT 0,
    "totalEffortHours" INTEGER NOT NULL DEFAULT 0,
    "avgTimePerTask" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeveloperPSPMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeRefactoringSuggestion" (
    "id" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,
    "sprintId" UUID,
    "filePath" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "RefactoringSeverity" NOT NULL,
    "tool" TEXT,
    "status" "RefactoringStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedById" UUID,
    "resolvedAt" TIMESTAMP(3),
    "lineNumber" INTEGER,
    "category" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeRefactoringSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLDeveloperAssignmentSuggestion" (
    "id" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "taskId" UUID,
    "suggestedUserId" UUID NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "wasAccepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedById" UUID,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MLDeveloperAssignmentSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLSprintRiskPrediction" (
    "id" UUID NOT NULL,
    "sprintId" UUID NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "factors" JSONB,
    "committedEffort" INTEGER,
    "teamCapacity" INTEGER,
    "historicalVelocity" DOUBLE PRECISION,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MLSprintRiskPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLTrainingData" (
    "id" UUID NOT NULL,
    "sprintId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "developerId" UUID,
    "storyId" UUID,
    "taskId" UUID,
    "dataType" "MLDataType" NOT NULL,
    "features" JSONB NOT NULL,
    "outcome" JSONB,
    "wasSuccessful" BOOLEAN,
    "completionTime" INTEGER,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MLTrainingData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_status_visibility_idx" ON "Project"("status", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "Project_name_key" ON "Project"("name");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE INDEX "UserStory_projectId_status_orderRank_idx" ON "UserStory"("projectId", "status", "orderRank");

-- CreateIndex
CREATE INDEX "UserStory_sprintId_idx" ON "UserStory"("sprintId");

-- CreateIndex
CREATE UNIQUE INDEX "UserStory_projectId_code_key" ON "UserStory"("projectId", "code");

-- CreateIndex
CREATE INDEX "UserStoryTag_value_idx" ON "UserStoryTag"("value");

-- CreateIndex
CREATE UNIQUE INDEX "UserStoryTag_storyId_value_key" ON "UserStoryTag"("storyId", "value");

-- CreateIndex
CREATE INDEX "EstimationSession_projectId_idx" ON "EstimationSession"("projectId");

-- CreateIndex
CREATE INDEX "EstimationSession_moderatorId_idx" ON "EstimationSession"("moderatorId");

-- CreateIndex
CREATE INDEX "EstimationSession_storyId_idx" ON "EstimationSession"("storyId");

-- CreateIndex
CREATE INDEX "EstimationVote_sessionId_idx" ON "EstimationVote"("sessionId");

-- CreateIndex
CREATE INDEX "EstimationVote_userId_idx" ON "EstimationVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EstimationVote_sessionId_userId_roundNumber_key" ON "EstimationVote"("sessionId", "userId", "roundNumber");

-- CreateIndex
CREATE INDEX "ProjectConfig_projectId_key_idx" ON "ProjectConfig"("projectId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_requestedById_idx" ON "PasswordResetToken"("requestedById");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_emailHash_createdAt_idx" ON "PasswordResetRequest"("emailHash", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_requestedIp_createdAt_idx" ON "PasswordResetRequest"("requestedIp", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_userId_createdAt_idx" ON "PasswordResetRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Sprint_projectId_status_idx" ON "Sprint"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Sprint_projectId_number_key" ON "Sprint"("projectId", "number");

-- CreateIndex
CREATE INDEX "Task_storyId_status_idx" ON "Task"("storyId", "status");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_storyId_code_key" ON "Task"("storyId", "code");

-- CreateIndex
CREATE INDEX "TaskActivityLog_taskId_createdAt_idx" ON "TaskActivityLog"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskActivityLog_userId_idx" ON "TaskActivityLog"("userId");

-- CreateIndex
CREATE INDEX "DailyScrum_sprintId_date_idx" ON "DailyScrum"("sprintId", "date");

-- CreateIndex
CREATE INDEX "DailyScrum_userId_idx" ON "DailyScrum"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyScrum_sprintId_userId_date_key" ON "DailyScrum"("sprintId", "userId", "date");

-- CreateIndex
CREATE INDEX "DailyScrumStory_storyId_idx" ON "DailyScrumStory"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyScrumStory_dailyScrumId_storyId_key" ON "DailyScrumStory"("dailyScrumId", "storyId");

-- CreateIndex
CREATE INDEX "BurndownSnapshot_sprintId_date_idx" ON "BurndownSnapshot"("sprintId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BurndownSnapshot_sprintId_date_key" ON "BurndownSnapshot"("sprintId", "date");

-- CreateIndex
CREATE INDEX "Repository_projectId_idx" ON "Repository"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_projectId_url_key" ON "Repository"("projectId", "url");

-- CreateIndex
CREATE INDEX "GitHubCommit_repositoryId_idx" ON "GitHubCommit"("repositoryId");

-- CreateIndex
CREATE INDEX "GitHubCommit_linkedStoryId_idx" ON "GitHubCommit"("linkedStoryId");

-- CreateIndex
CREATE INDEX "GitHubCommit_linkedTaskId_idx" ON "GitHubCommit"("linkedTaskId");

-- CreateIndex
CREATE INDEX "GitHubCommit_committedAt_idx" ON "GitHubCommit"("committedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubCommit_repositoryId_sha_key" ON "GitHubCommit"("repositoryId", "sha");

-- CreateIndex
CREATE INDEX "GitHubPullRequest_repositoryId_idx" ON "GitHubPullRequest"("repositoryId");

-- CreateIndex
CREATE INDEX "GitHubPullRequest_linkedStoryId_idx" ON "GitHubPullRequest"("linkedStoryId");

-- CreateIndex
CREATE INDEX "GitHubPullRequest_linkedTaskId_idx" ON "GitHubPullRequest"("linkedTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubPullRequest_repositoryId_number_key" ON "GitHubPullRequest"("repositoryId", "number");

-- CreateIndex
CREATE INDEX "GitHubSyncLog_repositoryId_idx" ON "GitHubSyncLog"("repositoryId");

-- CreateIndex
CREATE INDEX "GitHubSyncLog_userId_idx" ON "GitHubSyncLog"("userId");

-- CreateIndex
CREATE INDEX "GitHubSyncLog_executedAt_idx" ON "GitHubSyncLog"("executedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SprintReview_sprintId_key" ON "SprintReview"("sprintId");

-- CreateIndex
CREATE INDEX "SprintReview_sprintId_idx" ON "SprintReview"("sprintId");

-- CreateIndex
CREATE INDEX "SprintReview_createdById_idx" ON "SprintReview"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "SprintRetrospective_sprintId_key" ON "SprintRetrospective"("sprintId");

-- CreateIndex
CREATE INDEX "SprintRetrospective_sprintId_idx" ON "SprintRetrospective"("sprintId");

-- CreateIndex
CREATE INDEX "SprintRetrospective_createdById_idx" ON "SprintRetrospective"("createdById");

-- CreateIndex
CREATE INDEX "ImprovementAction_retrospectiveId_idx" ON "ImprovementAction"("retrospectiveId");

-- CreateIndex
CREATE INDEX "ImprovementAction_status_idx" ON "ImprovementAction"("status");

-- CreateIndex
CREATE INDEX "DeveloperPSPMetrics_userId_idx" ON "DeveloperPSPMetrics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeveloperPSPMetrics_sprintId_userId_key" ON "DeveloperPSPMetrics"("sprintId", "userId");

-- CreateIndex
CREATE INDEX "CodeRefactoringSuggestion_repositoryId_idx" ON "CodeRefactoringSuggestion"("repositoryId");

-- CreateIndex
CREATE INDEX "CodeRefactoringSuggestion_sprintId_idx" ON "CodeRefactoringSuggestion"("sprintId");

-- CreateIndex
CREATE INDEX "CodeRefactoringSuggestion_status_idx" ON "CodeRefactoringSuggestion"("status");

-- CreateIndex
CREATE INDEX "CodeRefactoringSuggestion_resolvedById_idx" ON "CodeRefactoringSuggestion"("resolvedById");

-- CreateIndex
CREATE INDEX "MLDeveloperAssignmentSuggestion_storyId_idx" ON "MLDeveloperAssignmentSuggestion"("storyId");

-- CreateIndex
CREATE INDEX "MLDeveloperAssignmentSuggestion_taskId_idx" ON "MLDeveloperAssignmentSuggestion"("taskId");

-- CreateIndex
CREATE INDEX "MLDeveloperAssignmentSuggestion_suggestedUserId_idx" ON "MLDeveloperAssignmentSuggestion"("suggestedUserId");

-- CreateIndex
CREATE INDEX "MLDeveloperAssignmentSuggestion_generatedAt_idx" ON "MLDeveloperAssignmentSuggestion"("generatedAt");

-- CreateIndex
CREATE INDEX "MLSprintRiskPrediction_sprintId_idx" ON "MLSprintRiskPrediction"("sprintId");

-- CreateIndex
CREATE INDEX "MLSprintRiskPrediction_generatedAt_idx" ON "MLSprintRiskPrediction"("generatedAt");

-- CreateIndex
CREATE INDEX "MLTrainingData_sprintId_idx" ON "MLTrainingData"("sprintId");

-- CreateIndex
CREATE INDEX "MLTrainingData_projectId_idx" ON "MLTrainingData"("projectId");

-- CreateIndex
CREATE INDEX "MLTrainingData_developerId_idx" ON "MLTrainingData"("developerId");

-- CreateIndex
CREATE INDEX "MLTrainingData_dataType_idx" ON "MLTrainingData"("dataType");

-- CreateIndex
CREATE INDEX "MLTrainingData_collectedAt_idx" ON "MLTrainingData"("collectedAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStory" ADD CONSTRAINT "UserStory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStory" ADD CONSTRAINT "UserStory_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStoryTag" ADD CONSTRAINT "UserStoryTag_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "UserStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationSession" ADD CONSTRAINT "EstimationSession_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "UserStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationSession" ADD CONSTRAINT "EstimationSession_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationSession" ADD CONSTRAINT "EstimationSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationVote" ADD CONSTRAINT "EstimationVote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EstimationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimationVote" ADD CONSTRAINT "EstimationVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectConfig" ADD CONSTRAINT "ProjectConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "UserStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskActivityLog" ADD CONSTRAINT "TaskActivityLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskActivityLog" ADD CONSTRAINT "TaskActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyScrum" ADD CONSTRAINT "DailyScrum_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyScrum" ADD CONSTRAINT "DailyScrum_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyScrumStory" ADD CONSTRAINT "DailyScrumStory_dailyScrumId_fkey" FOREIGN KEY ("dailyScrumId") REFERENCES "DailyScrum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyScrumStory" ADD CONSTRAINT "DailyScrumStory_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "UserStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BurndownSnapshot" ADD CONSTRAINT "BurndownSnapshot_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubCommit" ADD CONSTRAINT "GitHubCommit_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubCommit" ADD CONSTRAINT "GitHubCommit_linkedStoryId_fkey" FOREIGN KEY ("linkedStoryId") REFERENCES "UserStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubCommit" ADD CONSTRAINT "GitHubCommit_linkedTaskId_fkey" FOREIGN KEY ("linkedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubPullRequest" ADD CONSTRAINT "GitHubPullRequest_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubPullRequest" ADD CONSTRAINT "GitHubPullRequest_linkedStoryId_fkey" FOREIGN KEY ("linkedStoryId") REFERENCES "UserStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubPullRequest" ADD CONSTRAINT "GitHubPullRequest_linkedTaskId_fkey" FOREIGN KEY ("linkedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubSyncLog" ADD CONSTRAINT "GitHubSyncLog_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubSyncLog" ADD CONSTRAINT "GitHubSyncLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintReview" ADD CONSTRAINT "SprintReview_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintReview" ADD CONSTRAINT "SprintReview_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintRetrospective" ADD CONSTRAINT "SprintRetrospective_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintRetrospective" ADD CONSTRAINT "SprintRetrospective_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImprovementAction" ADD CONSTRAINT "ImprovementAction_retrospectiveId_fkey" FOREIGN KEY ("retrospectiveId") REFERENCES "SprintRetrospective"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeveloperPSPMetrics" ADD CONSTRAINT "DeveloperPSPMetrics_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeveloperPSPMetrics" ADD CONSTRAINT "DeveloperPSPMetrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeRefactoringSuggestion" ADD CONSTRAINT "CodeRefactoringSuggestion_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeRefactoringSuggestion" ADD CONSTRAINT "CodeRefactoringSuggestion_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeRefactoringSuggestion" ADD CONSTRAINT "CodeRefactoringSuggestion_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLDeveloperAssignmentSuggestion" ADD CONSTRAINT "MLDeveloperAssignmentSuggestion_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "UserStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLDeveloperAssignmentSuggestion" ADD CONSTRAINT "MLDeveloperAssignmentSuggestion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLDeveloperAssignmentSuggestion" ADD CONSTRAINT "MLDeveloperAssignmentSuggestion_suggestedUserId_fkey" FOREIGN KEY ("suggestedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLDeveloperAssignmentSuggestion" ADD CONSTRAINT "MLDeveloperAssignmentSuggestion_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLSprintRiskPrediction" ADD CONSTRAINT "MLSprintRiskPrediction_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLTrainingData" ADD CONSTRAINT "MLTrainingData_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLTrainingData" ADD CONSTRAINT "MLTrainingData_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLTrainingData" ADD CONSTRAINT "MLTrainingData_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLTrainingData" ADD CONSTRAINT "MLTrainingData_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "UserStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLTrainingData" ADD CONSTRAINT "MLTrainingData_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
