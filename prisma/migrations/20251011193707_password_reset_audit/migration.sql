-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."PasswordResetRequest" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "emailHash" TEXT NOT NULL,
    "requestedIp" TEXT,
    "requestedUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordResetRequest_emailHash_createdAt_idx" ON "public"."PasswordResetRequest"("emailHash", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_requestedIp_createdAt_idx" ON "public"."PasswordResetRequest"("requestedIp", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_userId_createdAt_idx" ON "public"."PasswordResetRequest"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
