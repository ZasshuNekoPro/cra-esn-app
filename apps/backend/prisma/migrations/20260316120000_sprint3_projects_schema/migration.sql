-- ─── Sprint 3 Migration — Projects Module ──────────────────────────────────────
-- Handles: WeatherStatus→WeatherState (enum rename + data migration),
--          CommentVisibility (new), ProjectStatus (replaces isActive),
--          MilestoneStatus (new), ValidationStatus +ARCHIVED (extend),
--          ProjectValidationRequest + ProjectValidationDocument (new models),
--          sprint-3 column additions (estimatedDays, closedAt, status, etc.)

-- ── 1. WeatherState enum (replaces WeatherStatus) ────────────────────────────

CREATE TYPE "weather_state" AS ENUM ('SUNNY', 'CLOUDY', 'RAINY', 'STORM', 'VALIDATION_PENDING', 'VALIDATED');

ALTER TABLE "weather_entries"
  ADD COLUMN "state" "weather_state";

UPDATE "weather_entries" SET "state" = CASE "status"::text
  WHEN 'GREEN'  THEN 'SUNNY'::"weather_state"
  WHEN 'ORANGE' THEN 'CLOUDY'::"weather_state"
  WHEN 'RED'    THEN 'STORM'::"weather_state"
  ELSE 'SUNNY'::"weather_state"
END;

ALTER TABLE "weather_entries" ALTER COLUMN "state" SET NOT NULL;
ALTER TABLE "weather_entries" DROP COLUMN "status";

DROP TYPE IF EXISTS "weather_status";

-- ── 2. CommentVisibility enum ─────────────────────────────────────────────────

CREATE TYPE "comment_visibility" AS ENUM ('EMPLOYEE_ESN', 'EMPLOYEE_CLIENT', 'ALL');

ALTER TABLE "project_comments"
  ADD COLUMN "visibility" "comment_visibility" NOT NULL DEFAULT 'ALL';

UPDATE "project_comments"
  SET "visibility" = 'EMPLOYEE_ESN'::"comment_visibility"
  WHERE "is_private" = true;

ALTER TABLE "project_comments" DROP COLUMN "is_private";

-- Blocker columns
ALTER TABLE "project_comments"
  ADD COLUMN "is_blocker" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "resolved_at" TIMESTAMP(3),
  ADD COLUMN "resolved_by_id" TEXT;

ALTER TABLE "project_comments"
  ADD CONSTRAINT "project_comments_resolved_by_id_fkey"
  FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 3. ProjectStatus enum (replaces isActive on projects) ────────────────────

CREATE TYPE "project_status" AS ENUM ('ACTIVE', 'PAUSED', 'CLOSED');

ALTER TABLE "projects"
  ADD COLUMN "status" "project_status" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "closed_at" TIMESTAMP(3),
  ADD COLUMN "estimated_days" INTEGER;

UPDATE "projects"
  SET "status" = 'CLOSED'::"project_status"
  WHERE "is_active" = false;

ALTER TABLE "projects" DROP COLUMN "is_active";

-- ── 4. MilestoneStatus enum ───────────────────────────────────────────────────

CREATE TYPE "milestone_status" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE', 'LATE', 'ARCHIVED');

ALTER TABLE "milestones"
  ADD COLUMN "status" "milestone_status" NOT NULL DEFAULT 'PLANNED',
  ADD COLUMN "validated_at" TIMESTAMP(3);

-- Backfill: completed milestones (completedAt not null) → DONE
UPDATE "milestones"
  SET "status" = 'DONE'::"milestone_status"
  WHERE "completed_at" IS NOT NULL;

-- ── 5. ValidationStatus +ARCHIVED ────────────────────────────────────────────

ALTER TYPE "ValidationStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- ── 6. ProjectValidationRequest model ────────────────────────────────────────

CREATE TABLE "project_validation_requests" (
  "id"               TEXT NOT NULL,
  "title"            TEXT NOT NULL,
  "description"      TEXT NOT NULL,
  "target_role"      "Role" NOT NULL,
  "status"           "ValidationStatus" NOT NULL DEFAULT 'PENDING',
  "decision_comment" TEXT,
  "requested_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at"      TIMESTAMP(3),
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "project_id"       TEXT NOT NULL,
  "requested_by_id"  TEXT NOT NULL,
  "resolver_id"      TEXT,

  CONSTRAINT "project_validation_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_validation_requests_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_validation_requests_requested_by_id_fkey"
    FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "project_validation_requests_resolver_id_fkey"
    FOREIGN KEY ("resolver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ── 7. ProjectValidationDocument model ───────────────────────────────────────

CREATE TABLE "project_validation_documents" (
  "id"            TEXT NOT NULL,
  "validation_id" TEXT NOT NULL,
  "document_id"   TEXT NOT NULL,

  CONSTRAINT "project_validation_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_validation_documents_validation_id_document_id_key"
    UNIQUE ("validation_id", "document_id"),
  CONSTRAINT "project_validation_documents_validation_id_fkey"
    FOREIGN KEY ("validation_id") REFERENCES "project_validation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_validation_documents_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
