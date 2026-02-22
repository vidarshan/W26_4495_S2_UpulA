/*
  Warnings:

  - You are about to drop the column `endDateTime` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `staffId` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `startDateTime` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `endsUnit` on the `Recurrence` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_jobId_fkey";

-- DropForeignKey
ALTER TABLE "JobLineItem" DROP CONSTRAINT "JobLineItem_jobId_fkey";

-- DropForeignKey
ALTER TABLE "JobNote" DROP CONSTRAINT "JobNote_jobId_fkey";

-- DropForeignKey
ALTER TABLE "JobNoteImage" DROP CONSTRAINT "JobNoteImage_noteId_fkey";

-- DropForeignKey
ALTER TABLE "VisitNote" DROP CONSTRAINT "VisitNote_appointmentId_fkey";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "endDateTime",
DROP COLUMN "staffId",
DROP COLUMN "startDateTime";

-- AlterTable
ALTER TABLE "Recurrence" DROP COLUMN "endsUnit",
ADD COLUMN     "endsAfter" INTEGER;

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");

-- CreateIndex
CREATE INDEX "Appointment_endTime_idx" ON "Appointment"("endTime");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLineItem" ADD CONSTRAINT "JobLineItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNote" ADD CONSTRAINT "JobNote_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobNoteImage" ADD CONSTRAINT "JobNoteImage_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "JobNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitNote" ADD CONSTRAINT "VisitNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
