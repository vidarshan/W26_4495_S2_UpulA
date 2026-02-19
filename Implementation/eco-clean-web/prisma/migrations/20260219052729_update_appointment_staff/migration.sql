/*
  Warnings:

  - You are about to drop the column `staffId` on the `Appointment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_staffId_fkey";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "staffId";

-- CreateTable
CREATE TABLE "_AppointmentStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AppointmentStaff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AppointmentStaff_B_index" ON "_AppointmentStaff"("B");

-- AddForeignKey
ALTER TABLE "_AppointmentStaff" ADD CONSTRAINT "_AppointmentStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AppointmentStaff" ADD CONSTRAINT "_AppointmentStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
