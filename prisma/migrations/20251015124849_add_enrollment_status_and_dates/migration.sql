-- CreateEnum
CREATE TYPE "public"."EnrollmentStatus" AS ENUM ('WISHLIST', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "public"."course_enrollments" ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "status" "public"."EnrollmentStatus" NOT NULL DEFAULT 'WISHLIST';
