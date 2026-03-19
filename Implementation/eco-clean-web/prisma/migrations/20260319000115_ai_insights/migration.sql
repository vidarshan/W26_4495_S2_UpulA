-- CreateTable
CREATE TABLE "AppointmentAiInsight" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "model" TEXT,
    "promptVersion" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentAiInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentAiInsight_appointmentId_key" ON "AppointmentAiInsight"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentAiInsight_appointmentId_idx" ON "AppointmentAiInsight"("appointmentId");

-- AddForeignKey
ALTER TABLE "AppointmentAiInsight" ADD CONSTRAINT "AppointmentAiInsight_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
