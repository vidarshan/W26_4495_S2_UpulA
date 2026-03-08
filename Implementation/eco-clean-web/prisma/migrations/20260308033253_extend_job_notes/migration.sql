-- CreateEnum
CREATE TYPE "JobNoteCategory" AS ENUM ('GENERAL', 'ACCESS', 'CLEANING', 'SAFETY', 'SUPPLIES', 'CLIENT_PREFERENCE');

-- AlterTable
ALTER TABLE "JobNote" ADD COLUMN     "category" "JobNoteCategory",
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "isClientVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
