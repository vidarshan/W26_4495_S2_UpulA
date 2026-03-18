-- CreateTable
CREATE TABLE "AppointmentWorkSession" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "staffId" TEXT,
    "startedAt" TIMESTAMPTZ(6) NOT NULL,
    "endedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentWorkSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentWorkSession_appointmentId_idx" ON "AppointmentWorkSession"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentWorkSession_staffId_idx" ON "AppointmentWorkSession"("staffId");

-- AddForeignKey
ALTER TABLE "AppointmentWorkSession" ADD CONSTRAINT "AppointmentWorkSession_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentWorkSession" ADD CONSTRAINT "AppointmentWorkSession_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
