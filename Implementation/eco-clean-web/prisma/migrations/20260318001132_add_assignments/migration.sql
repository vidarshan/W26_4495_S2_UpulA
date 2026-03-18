/*
  Warnings:

  - You are about to drop the `_AppointmentStaff` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `staffId` on table `AppointmentWorkSession` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "TimesheetPeriodStatus" AS ENUM ('OPEN', 'LOCKED');

-- DropForeignKey
ALTER TABLE "AppointmentWorkSession" DROP CONSTRAINT "AppointmentWorkSession_staffId_fkey";

-- DropForeignKey
ALTER TABLE "_AppointmentStaff" DROP CONSTRAINT "_AppointmentStaff_A_fkey";

-- DropForeignKey
ALTER TABLE "_AppointmentStaff" DROP CONSTRAINT "_AppointmentStaff_B_fkey";

-- AlterTable
ALTER TABLE "Appointment" ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "AppointmentWorkSession" ALTER COLUMN "staffId" SET NOT NULL;

-- DropTable
DROP TABLE "_AppointmentStaff";

-- CreateTable
CREATE TABLE "StaffAddress" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "street1" TEXT NOT NULL,
    "street2" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timesheet" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "status" "TimesheetStatus" NOT NULL DEFAULT 'OPEN',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetDay" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "minutesWorked" INTEGER NOT NULL,
    "hourlyRate" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimesheetDay_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE UNIQUE INDEX "StaffAddress_staffProfileId_key" ON "StaffAddress"("staffProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyContact_staffProfileId_key" ON "EmergencyContact"("staffProfileId");

-- CreateIndex
CREATE INDEX "Assignment_appointmentId_idx" ON "Assignment"("appointmentId");

-- CreateIndex
CREATE INDEX "Assignment_staffId_idx" ON "Assignment"("staffId");

-- CreateIndex
CREATE INDEX "Assignment_status_idx" ON "Assignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_appointmentId_staffId_key" ON "Assignment"("appointmentId", "staffId");

-- CreateIndex
CREATE INDEX "StaffAvailability_staffProfileId_idx" ON "StaffAvailability"("staffProfileId");

-- CreateIndex
CREATE INDEX "StaffAvailability_effectiveFrom_idx" ON "StaffAvailability"("effectiveFrom");

-- CreateIndex
CREATE INDEX "Leave_staffId_idx" ON "Leave"("staffId");

-- CreateIndex
CREATE INDEX "Leave_startAt_idx" ON "Leave"("startAt");

-- CreateIndex
CREATE INDEX "Leave_endAt_idx" ON "Leave"("endAt");

-- CreateIndex
CREATE INDEX "TimesheetPeriod_startDate_idx" ON "TimesheetPeriod"("startDate");

-- CreateIndex
CREATE INDEX "TimesheetPeriod_endDate_idx" ON "TimesheetPeriod"("endDate");

-- CreateIndex
CREATE INDEX "TimesheetPeriod_status_idx" ON "TimesheetPeriod"("status");

-- CreateIndex
CREATE INDEX "Timesheet_periodId_idx" ON "Timesheet"("periodId");

-- CreateIndex
CREATE INDEX "Timesheet_staffId_idx" ON "Timesheet"("staffId");

-- CreateIndex
CREATE INDEX "Timesheet_approvedById_idx" ON "Timesheet"("approvedById");

-- CreateIndex
CREATE INDEX "Timesheet_status_idx" ON "Timesheet"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Timesheet_periodId_staffId_key" ON "Timesheet"("periodId", "staffId");

-- CreateIndex
CREATE INDEX "TimesheetDay_timesheetId_idx" ON "TimesheetDay"("timesheetId");

-- CreateIndex
CREATE INDEX "TimesheetDay_workDate_idx" ON "TimesheetDay"("workDate");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetDay_timesheetId_workDate_key" ON "TimesheetDay"("timesheetId", "workDate");

-- CreateIndex
CREATE UNIQUE INDEX "PayStatement_userId_timesheetPeriodId_key" ON "PayStatement"("userId", "timesheetPeriodId");

-- CreateIndex
CREATE INDEX "Address_clientId_idx" ON "Address"("clientId");

-- CreateIndex
CREATE INDEX "Appointment_jobId_idx" ON "Appointment"("jobId");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "AppointmentImage_appointmentId_idx" ON "AppointmentImage"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentWorkSession_startedAt_idx" ON "AppointmentWorkSession"("startedAt");

-- CreateIndex
CREATE INDEX "ClientNote_clientId_idx" ON "ClientNote"("clientId");

-- CreateIndex
CREATE INDEX "Job_clientId_idx" ON "Job"("clientId");

-- CreateIndex
CREATE INDEX "Job_addressId_idx" ON "Job"("addressId");

-- CreateIndex
CREATE INDEX "JobLineItem_jobId_idx" ON "JobLineItem"("jobId");

-- CreateIndex
CREATE INDEX "JobNote_jobId_idx" ON "JobNote"("jobId");

-- CreateIndex
CREATE INDEX "JobNote_createdById_idx" ON "JobNote"("createdById");

-- CreateIndex
CREATE INDEX "JobNoteImage_noteId_idx" ON "JobNoteImage"("noteId");

-- CreateIndex
CREATE INDEX "VisitNote_appointmentId_idx" ON "VisitNote"("appointmentId");

-- CreateIndex
CREATE INDEX "VisitNote_createdById_idx" ON "VisitNote"("createdById");

-- AddForeignKey
ALTER TABLE "AppointmentWorkSession" ADD CONSTRAINT "AppointmentWorkSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAddress" ADD CONSTRAINT "StaffAddress_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "TimesheetPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetDay" ADD CONSTRAINT "TimesheetDay_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
