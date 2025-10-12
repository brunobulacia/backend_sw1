-- AlterTable
ALTER TABLE "public"."PasswordResetToken" ADD COLUMN     "requestedById" UUID,
ADD COLUMN     "requestedIp" TEXT,
ADD COLUMN     "requestedUserAgent" TEXT;

-- CreateIndex
CREATE INDEX "PasswordResetToken_requestedById_idx" ON "public"."PasswordResetToken"("requestedById");

-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
