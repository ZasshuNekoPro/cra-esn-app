-- Add ESN_MANAGER to Role enum
ALTER TYPE "Role" ADD VALUE 'ESN_MANAGER';

-- DropForeignKey (will be re-added with CASCADE)
ALTER TABLE "embeddings" DROP CONSTRAINT "embeddings_employee_id_fkey";

-- AlterTable — remove unused default on token
ALTER TABLE "report_validation_requests" ALTER COLUMN "token" DROP DEFAULT;

-- AlterTable — add esn_id to users
ALTER TABLE "users" ADD COLUMN "esn_id" TEXT;

-- DropEnum — WeatherStatus was deprecated and removed from schema
DROP TYPE "WeatherStatus";

-- CreateTable — ESN companies
CREATE TABLE "esns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siret" TEXT,
    "address" TEXT,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "esns_siret_key" ON "esns"("siret");

-- AddForeignKey — users.esn_id → esns.id
ALTER TABLE "users" ADD CONSTRAINT "users_esn_id_fkey" FOREIGN KEY ("esn_id") REFERENCES "esns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey — restore embeddings FK with CASCADE
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
