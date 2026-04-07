ALTER TABLE "User"
ADD COLUMN "lastKnownJobLocation" TEXT;

UPDATE "User" AS u
SET "lastKnownJobLocation" = NULLIF(
  concat_ws(
    ', ',
    NULLIF(trim(sa."street1"), ''),
    NULLIF(trim(COALESCE(sa."street2", '')), ''),
    NULLIF(trim(sa."city"), ''),
    NULLIF(trim(sa."province"), ''),
    NULLIF(trim(COALESCE(sa."postalCode", '')), ''),
    NULLIF(trim(sa."country"), '')
  ),
  ''
)
FROM "StaffProfile" AS sp
LEFT JOIN "StaffAddress" AS sa
  ON sa."staffProfileId" = sp."id"
WHERE sp."userId" = u."id"
  AND u."role" = 'STAFF';
