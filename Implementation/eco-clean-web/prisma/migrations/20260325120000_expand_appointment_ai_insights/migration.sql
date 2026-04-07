DROP INDEX "AppointmentAiInsight_appointmentId_key";

CREATE UNIQUE INDEX "AppointmentAiInsight_appointmentId_type_key"
ON "AppointmentAiInsight"("appointmentId", "type");

CREATE INDEX "AppointmentAiInsight_type_idx"
ON "AppointmentAiInsight"("type");
