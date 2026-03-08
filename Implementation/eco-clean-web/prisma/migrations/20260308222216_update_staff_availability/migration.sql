/*
  Warnings:

  - You are about to drop the column `dayOfWeek` on the `StaffAvailability` table. All the data in the column will be lost.
  - You are about to drop the column `effectiveTo` on the `StaffAvailability` table. All the data in the column will be lost.
  - You are about to drop the column `endMinute` on the `StaffAvailability` table. All the data in the column will be lost.
  - You are about to drop the column `startMinute` on the `StaffAvailability` table. All the data in the column will be lost.
  - Made the column `effectiveFrom` on table `StaffAvailability` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "StaffAvailability" DROP COLUMN "dayOfWeek",
DROP COLUMN "effectiveTo",
DROP COLUMN "endMinute",
DROP COLUMN "startMinute",
ADD COLUMN     "friActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "friS1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "friS2" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monS1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monS2" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "satActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "satS1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "satS2" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sunActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sunS1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sunS2" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thuActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thuS1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thuS2" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tueActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tueS1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tueS2" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wedActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wedS1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wedS2" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "effectiveFrom" SET NOT NULL;
