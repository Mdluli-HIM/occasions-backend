-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "eventBriefId" TEXT;

-- CreateTable
CREATE TABLE "EventBrief" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "occasion" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "eventDate" TEXT NOT NULL DEFAULT '',
    "guests" TEXT NOT NULL DEFAULT '',
    "budget" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "serviceSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventBrief_customerId_idx" ON "EventBrief"("customerId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_eventBriefId_fkey" FOREIGN KEY ("eventBriefId") REFERENCES "EventBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBrief" ADD CONSTRAINT "EventBrief_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
