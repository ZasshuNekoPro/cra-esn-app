-- Migration: add_document_metadata
-- Adds DocumentMetadata model (1:1 optional with Document)

BEGIN;

CREATE TABLE "document_metadata" (
    "id"               TEXT NOT NULL,
    "version"          TEXT NOT NULL DEFAULT '1.0',
    "is_obsolete"      BOOLEAN NOT NULL DEFAULT false,
    "document_date"    TIMESTAMP(3),
    "service_involved" TEXT,
    "tags"             TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,
    "document_id"      TEXT NOT NULL,

    CONSTRAINT "document_metadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_metadata_document_id_key" ON "document_metadata"("document_id");

ALTER TABLE "document_metadata"
    ADD CONSTRAINT "document_metadata_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
