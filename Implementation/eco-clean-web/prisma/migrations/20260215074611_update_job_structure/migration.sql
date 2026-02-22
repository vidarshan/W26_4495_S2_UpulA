/*
  Warnings:

  - Added the required column `endDateTime` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDateTime` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endType` to the `Recurrence` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_staffId_fkey";

-- DropForeignKey
ALTER TABLE "Recurrence" DROP CONSTRAINT "Recurrence_jobId_fkey";

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "endDateTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "isAnytime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startDateTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "visitInstructions" TEXT;

-- AlterTable
ALTER TABLE "JobLineItem" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Recurrence" ADD COLUMN     "endType" TEXT NOT NULL,
ADD COLUMN     "endsUnit" TEXT;

-- CreateTable
CREATE TABLE "_JobStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JobStaff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_JobStaff_B_index" ON "_JobStaff"("B");

-- AddForeignKey
ALTER TABLE "Recurrence" ADD CONSTRAINT "Recurrence_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobStaff" ADD CONSTRAINT "_JobStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobStaff" ADD CONSTRAINT "_JobStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
