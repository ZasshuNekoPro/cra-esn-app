-- Migration: add_context_notes
-- Adds ContextNote model (RAG information mode output, employee-private)
-- onDelete: Cascade on employee_id — GDPR Art. 17 erasure path
-- userInput is personal data — excluded from audit logs (see ContextNotesService)

BEGIN;

CREATE TABLE "context_notes" (
    "id"         TEXT NOT NULL,
    "content"    TEXT NOT NULL,
    "user_input" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mission_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,

    CONSTRAINT "context_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "context_notes_mission_id_idx" ON "context_notes"("mission_id");
CREATE INDEX "context_notes_employee_id_idx" ON "context_notes"("employee_id");

ALTER TABLE "context_notes"
    ADD CONSTRAINT "context_notes_mission_id_fkey"
    FOREIGN KEY ("mission_id") REFERENCES "missions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "context_notes"
    ADD CONSTRAINT "context_notes_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
