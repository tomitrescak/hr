/*
  Warnings:

  - You are about to drop the column `completion` on the `key_results` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."key_results" DROP COLUMN "completion",
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0;
