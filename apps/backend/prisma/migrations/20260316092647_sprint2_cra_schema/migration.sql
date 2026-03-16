/*
  Warnings:

  - You are about to drop the column `leave_type` on the `cra_entries` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CraEntryType" AS ENUM ('WORK_ONSITE', 'WORK_REMOTE', 'WORK_TRAVEL', 'LEAVE_CP', 'LEAVE_RTT', 'SICK', 'HOLIDAY', 'TRAINING', 'ASTREINTE', 'OVERTIME');

-- CreateEnum
CREATE TYPE "PortionType" AS ENUM ('FULL', 'HALF_AM', 'HALF_PM');

-- AlterEnum
ALTER TYPE "CraStatus" ADD VALUE 'SIGNED_ESN';

-- DropIndex
DROP INDEX "embeddings_vector_idx";

-- AlterTable
ALTER TABLE "cra_entries" DROP COLUMN "leave_type",
ADD COLUMN     "entry_type" "CraEntryType" NOT NULL DEFAULT 'WORK_ONSITE';

-- AlterTable
ALTER TABLE "cra_months" ADD COLUMN     "rejection_comment" TEXT,
ADD COLUMN     "signed_by_client_at" TIMESTAMP(3),
ADD COLUMN     "signed_by_employee_at" TIMESTAMP(3),
ADD COLUMN     "signed_by_esn_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "project_entries" ADD COLUMN     "cra_entry_id" TEXT,
ADD COLUMN     "portion" "PortionType";

-- CreateTable
CREATE TABLE "public_holidays" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'FR',

    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "public_holidays_date_country_key" ON "public_holidays"("date", "country");

-- AddForeignKey
ALTER TABLE "project_entries" ADD CONSTRAINT "project_entries_cra_entry_id_fkey" FOREIGN KEY ("cra_entry_id") REFERENCES "cra_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
