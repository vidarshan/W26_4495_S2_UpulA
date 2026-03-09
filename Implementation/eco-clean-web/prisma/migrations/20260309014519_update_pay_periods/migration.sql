/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `TimesheetEntry` table. All the data in the column will be lost.
  - Added the required column `payPeriodEnd` to the `TimesheetEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payPeriodStart` to the `TimesheetEntry` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PayLineCategory" AS ENUM ('EARNING', 'DEDUCTION');

-- AlterTable
ALTER TABLE "TimesheetEntry" DROP COLUMN "updatedAt",
ADD COLUMN     "payPeriodEnd" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "payPeriodStart" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "PayStatement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timesheetPeriodId" TEXT NOT NULL,
    "payPeriodStart" TIMESTAMP(3) NOT NULL,
    "payPeriodEnd" TIMESTAMP(3) NOT NULL,
    "payDate" TIMESTAMP(3) NOT NULL,
    "grossEarnings" DOUBLE PRECISION NOT NULL,
    "totalDeductions" DOUBLE PRECISION NOT NULL,
    "netEarnings" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB,

    CONSTRAINT "PayStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayStatement_userId_idx" ON "PayStatement"("userId");

-- CreateIndex
CREATE INDEX "PayStatement_timesheetPeriodId_idx" ON "PayStatement"("timesheetPeriodId");

-- AddForeignKey
ALTER TABLE "PayStatement" ADD CONSTRAINT "PayStatement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayStatement" ADD CONSTRAINT "PayStatement_timesheetPeriodId_fkey" FOREIGN KEY ("timesheetPeriodId") REFERENCES "TimesheetPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
