ALTER TABLE "User"
ALTER COLUMN "lastKnownJobLocation" TYPE JSONB
USING NULL;

UPDATE "User" AS u
SET "lastKnownJobLocation" = jsonb_strip_nulls(
  jsonb_build_object(
    'street1', NULLIF(trim(sa."street1"), ''),
    'street2', NULLIF(trim(COALESCE(sa."street2", '')), ''),
    'city', NULLIF(trim(sa."city"), ''),
    'province', NULLIF(trim(sa."province"), ''),
    'postalCode', NULLIF(trim(COALESCE(sa."postalCode", '')), ''),
    'country', NULLIF(trim(sa."country"), '')
  )
)
FROM "StaffProfile" AS sp
LEFT JOIN "StaffAddress" AS sa
  ON sa."staffProfileId" = sp."id"
WHERE sp."userId" = u."id"
  AND u."role" = 'STAFF';

UPDATE "User" AS u
SET "lastKnownJobLocation" = jsonb_strip_nulls(
  jsonb_build_object(
    'street1', NULLIF(trim(a."street1"), ''),
    'street2', NULLIF(trim(COALESCE(a."street2", '')), ''),
    'city', NULLIF(trim(a."city"), ''),
    'province', NULLIF(trim(a."province"), ''),
    'postalCode', NULLIF(trim(a."postalCode"), ''),
    'country', NULLIF(trim(a."country"), '')
  )
)
FROM "AppointmentWorkSession" AS aws
JOIN "Appointment" AS ap
  ON ap."id" = aws."appointmentId"
JOIN "Job" AS j
  ON j."id" = ap."jobId"
JOIN "Address" AS a
  ON a."id" = j."addressId"
WHERE aws."staffId" = u."id"
  AND aws."endedAt" IS NULL;
