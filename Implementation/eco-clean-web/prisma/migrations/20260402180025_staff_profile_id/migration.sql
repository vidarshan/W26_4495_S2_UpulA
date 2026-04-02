/*
  Warnings:

  - A unique constraint covering the columns `[staffProfileId]` on the table `StaffProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "StaffProfile" ADD COLUMN     "staffProfileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_staffProfileId_key" ON "StaffProfile"("staffProfileId");
