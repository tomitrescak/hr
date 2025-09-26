/*
  Warnings:

  - The values [NOVICE,COMPETENT,PROFICIENT] on the enum `Proficiency` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `contribution` on the `course_competencies` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `courses` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."Proficiency_new" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
ALTER TABLE "public"."person_competencies" ALTER COLUMN "proficiency" TYPE "public"."Proficiency_new" USING ("proficiency"::text::"public"."Proficiency_new");
ALTER TABLE "public"."competency_deltas" ALTER COLUMN "newProficiency" TYPE "public"."Proficiency_new" USING ("newProficiency"::text::"public"."Proficiency_new");
ALTER TYPE "public"."Proficiency" RENAME TO "Proficiency_old";
ALTER TYPE "public"."Proficiency_new" RENAME TO "Proficiency";
DROP TYPE "public"."Proficiency_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."course_competencies" DROP COLUMN "contribution";

-- AlterTable
ALTER TABLE "public"."courses" DROP COLUMN "link",
ADD COLUMN     "content" TEXT,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "maxEnrollments" INTEGER,
ADD COLUMN     "status" "public"."CourseStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "description" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."course_enrollments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "progress" INTEGER DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_courseId_personId_key" ON "public"."course_enrollments"("courseId", "personId");

-- AddForeignKey
ALTER TABLE "public"."course_enrollments" ADD CONSTRAINT "course_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_enrollments" ADD CONSTRAINT "course_enrollments_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
