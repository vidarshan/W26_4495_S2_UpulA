-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "completionSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "reminder1dSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminder5dSent" BOOLEAN NOT NULL DEFAULT false;
