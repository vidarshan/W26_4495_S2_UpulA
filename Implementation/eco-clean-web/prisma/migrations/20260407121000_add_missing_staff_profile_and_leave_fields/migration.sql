DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'LeaveStatus'
    ) THEN
        CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

ALTER TABLE "StaffProfile"
ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;

ALTER TABLE "Leave"
ADD COLUMN IF NOT EXISTS "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING';
