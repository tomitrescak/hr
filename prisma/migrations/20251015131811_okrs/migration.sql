-- AlterEnum
ALTER TYPE "public"."EntityKind" ADD VALUE 'KEY_RESULT';

-- AlterTable
ALTER TABLE "public"."tasks" ADD COLUMN     "okrId" TEXT;

-- CreateTable
CREATE TABLE "public"."key_results" (
    "id" TEXT NOT NULL,
    "okrId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completion" INTEGER NOT NULL DEFAULT 0,
    "target" TEXT,
    "metric" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "key_results_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."key_results" ADD CONSTRAINT "key_results_okrId_fkey" FOREIGN KEY ("okrId") REFERENCES "public"."okrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_okrId_fkey" FOREIGN KEY ("okrId") REFERENCES "public"."okrs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
