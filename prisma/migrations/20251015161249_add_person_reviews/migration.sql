-- CreateTable
CREATE TABLE "public"."person_reviews" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "recordingText" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_reviews_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."person_reviews" ADD CONSTRAINT "person_reviews_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
