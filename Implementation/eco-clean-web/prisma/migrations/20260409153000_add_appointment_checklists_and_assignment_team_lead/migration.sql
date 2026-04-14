-- Add explicit team lead tracking per assignment.
ALTER TABLE "Assignment"
ADD COLUMN "isTeamLead" BOOLEAN NOT NULL DEFAULT false;

-- Backfill one lead per appointment using the earliest assignment.
WITH ranked_assignments AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "appointmentId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS row_num
  FROM "Assignment"
)
UPDATE "Assignment" AS a
SET "isTeamLead" = true
FROM ranked_assignments AS ranked
WHERE a.id = ranked.id
  AND ranked.row_num = 1;

-- Add appointment checklist items.
CREATE TABLE "AppointmentChecklistItem" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMPTZ(6),
  "completedById" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppointmentChecklistItem_appointmentId_idx"
ON "AppointmentChecklistItem"("appointmentId");

CREATE INDEX "AppointmentChecklistItem_completedById_idx"
ON "AppointmentChecklistItem"("completedById");

CREATE INDEX "AppointmentChecklistItem_sortOrder_idx"
ON "AppointmentChecklistItem"("sortOrder");

ALTER TABLE "AppointmentChecklistItem"
ADD CONSTRAINT "AppointmentChecklistItem_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentChecklistItem"
ADD CONSTRAINT "AppointmentChecklistItem_completedById_fkey"
FOREIGN KEY ("completedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
