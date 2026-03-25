-- Sprint 6 — RAG Embeddings: add employee isolation + source tracking
-- Migration: 20260317100000_sprint6_rag_embeddings

-- Add required columns to embeddings table
ALTER TABLE "embeddings"
  ADD COLUMN "source_type" TEXT NOT NULL DEFAULT 'document',
  ADD COLUMN "source_id"   TEXT NOT NULL DEFAULT '',
  ADD COLUMN "employee_id" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Add foreign key constraint (employee_id → users.id)
ALTER TABLE "embeddings"
  ADD CONSTRAINT "embeddings_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Add unique constraint for upsert-by-source
ALTER TABLE "embeddings"
  ADD CONSTRAINT "embeddings_employee_id_source_type_source_id_key"
  UNIQUE ("employee_id", "source_type", "source_id");

-- Add index for fast lookups by employee
CREATE INDEX "embeddings_employee_id_idx" ON "embeddings"("employee_id");

-- Remove the DEFAULT placeholders now that constraint is in place
ALTER TABLE "embeddings"
  ALTER COLUMN "source_type" DROP DEFAULT,
  ALTER COLUMN "source_id"   DROP DEFAULT,
  ALTER COLUMN "employee_id" DROP DEFAULT;
