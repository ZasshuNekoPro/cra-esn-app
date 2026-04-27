-- CreateEnum
CREATE TYPE "ClientContactType" AS ENUM ('RESPONSABLE', 'RH', 'FINANCIER', 'TECHNIQUE', 'AUTRE');

-- CreateTable
CREATE TABLE "client_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siren" TEXT,
    "address" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "esn_id" TEXT NOT NULL,

    CONSTRAINT "client_companies_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "client_company_id" TEXT,
ADD COLUMN "client_contact_type" "ClientContactType";

-- AddForeignKey
ALTER TABLE "client_companies" ADD CONSTRAINT "client_companies_esn_id_fkey" FOREIGN KEY ("esn_id") REFERENCES "esns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_client_company_id_fkey" FOREIGN KEY ("client_company_id") REFERENCES "client_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
