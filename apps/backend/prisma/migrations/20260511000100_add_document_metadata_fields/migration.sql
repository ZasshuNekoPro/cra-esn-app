-- Add RAG-useful metadata fields to document_metadata
ALTER TABLE "document_metadata"
  ADD COLUMN IF NOT EXISTS "author"                  TEXT,
  ADD COLUMN IF NOT EXISTS "summary"                 TEXT,
  ADD COLUMN IF NOT EXISTS "language"                TEXT,
  ADD COLUMN IF NOT EXISTS "confidentiality_level"   TEXT,
  ADD COLUMN IF NOT EXISTS "applicable_from_date"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "applicable_until_date"   TIMESTAMP(3);
