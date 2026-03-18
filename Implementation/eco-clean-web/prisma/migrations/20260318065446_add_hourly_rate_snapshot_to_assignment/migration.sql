/*
  Warnings:

  - You are about to drop the column `actualEnd` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `actualStart` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `breakMinutes` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `postalCode` on the `StaffProfile` table. All the data in the column will be lost.
  - The `status` column on the `TimesheetPeriod` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `TimesheetEntry` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `hourlyRateAtTime` on table `Assignment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_staffId_fkey";

-- DropForeignKey
ALTER TABLE "Leave" DROP CONSTRAINT "Leave_staffId_fkey";

-- DropForeignKey
ALTER TABLE "StaffProfile" DROP CONSTRAINT "StaffProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "TimesheetEntry" DROP CONSTRAINT "TimesheetEntry_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "TimesheetEntry" DROP CONSTRAINT "TimesheetEntry_periodId_fkey";

-- DropForeignKey
ALTER TABLE "TimesheetEntry" DROP CONSTRAINT "TimesheetEntry_staffId_fkey";

-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "actualEnd",
DROP COLUMN "actualStart",
DROP COLUMN "breakMinutes",
ALTER COLUMN "plannedStart" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "plannedEnd" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "hourlyRateAtTime" SET NOT NULL,
ALTER COLUMN "hourlyRateAtTime" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "StaffProfile" DROP COLUMN "postalCode",
ADD COLUMN     "position" TEXT;

-- AlterTable
ALTER TABLE "TimesheetPeriod" DROP COLUMN "status",
ADD COLUMN     "status" "TimesheetPeriodStatus" NOT NULL DEFAULT 'OPEN';

-- DropTable
DROP TABLE "TimesheetEntry";

-- DropEnum
DROP TYPE "PayLineCategory";

-- CreateIndex
CREATE INDEX "TimesheetPeriod_status_idx" ON "TimesheetPeriod"("status");

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
