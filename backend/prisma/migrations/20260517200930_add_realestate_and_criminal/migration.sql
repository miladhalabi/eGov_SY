-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "titleDeedNumber" TEXT NOT NULL,
    "cadastralZone" TEXT NOT NULL,
    "parcelNumber" TEXT NOT NULL,
    "sizeSqm" DOUBLE PRECISION NOT NULL,
    "shares" INTEGER NOT NULL DEFAULT 2400,
    "ownerId" TEXT NOT NULL,
    "isMortgaged" BOOLEAN NOT NULL DEFAULT false,
    "isSeized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriminalRecord" (
    "id" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "hasCriminalRecord" BOOLEAN NOT NULL DEFAULT false,
    "convictions" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CriminalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriminalClearanceRequest" (
    "id" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CriminalClearanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_titleDeedNumber_key" ON "Property"("titleDeedNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CriminalRecord_nationalId_key" ON "CriminalRecord"("nationalId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriminalClearanceRequest" ADD CONSTRAINT "CriminalClearanceRequest_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
