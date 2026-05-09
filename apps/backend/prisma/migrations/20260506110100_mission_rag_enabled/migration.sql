-- Migration: mission_rag_enabled
-- Adds ragEnabled toggle to Mission model

BEGIN;

ALTER TABLE "missions"
    ADD COLUMN "rag_enabled" BOOLEAN NOT NULL DEFAULT false;

COMMIT;
