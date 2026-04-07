-- CreateTable
CREATE TABLE "TD1" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "sin" TEXT NOT NULL,
    "federalClaimAmount" DOUBLE PRECISION NOT NULL,
    "quebecClaimAmount" DOUBLE PRECISION NOT NULL,
    "additionalFederalTaxPerPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additionalQuebecTaxPerPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isExempt" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TD1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankDetails" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "institutionNo" TEXT NOT NULL,
    "transitNo" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,

    CONSTRAINT "BankDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TD1_staffProfileId_key" ON "TD1"("staffProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "BankDetails_staffProfileId_key" ON "BankDetails"("staffProfileId");

-- AddForeignKey
ALTER TABLE "TD1"
ADD CONSTRAINT "TD1_staffProfileId_fkey"
FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetails"
ADD CONSTRAINT "BankDetails_staffProfileId_fkey"
FOREIGN KEY ("staffProfileId") REFERENCES "StaffProfile"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
