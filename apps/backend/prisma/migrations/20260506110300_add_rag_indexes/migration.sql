-- prisma-no-transaction
-- Migration: add_rag_indexes
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction.
-- These indexes optimize mission-scoped RAG queries.

-- Partial index: only embeddings with source_type='document' need document_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_embeddings_document_id"
    ON "embeddings"("document_id")
    WHERE "source_type" = 'document';

-- Composite index for owner+mission document listing (DocumentsPanel, metadata queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_documents_owner_mission"
    ON "documents"("owner_id", "mission_id");
