-- AlterTable
ALTER TABLE "public"."people" ADD COLUMN     "alternativeEmail" TEXT,
ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
