/*
  Warnings:

  - A unique constraint covering the columns `[staffId]` on the table `StaffProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "StaffProfile" ADD COLUMN     "staffId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_staffId_key" ON "StaffProfile"("staffId");
