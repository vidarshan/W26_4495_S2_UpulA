/*
  Warnings:

  - You are about to drop the `_JobStaff` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_JobStaff" DROP CONSTRAINT "_JobStaff_A_fkey";

-- DropForeignKey
ALTER TABLE "_JobStaff" DROP CONSTRAINT "_JobStaff_B_fkey";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "_JobStaff";

-- CreateTable
CREATE TABLE "AppointmentImage" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "AppointmentImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentImage" ADD CONSTRAINT "AppointmentImage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
