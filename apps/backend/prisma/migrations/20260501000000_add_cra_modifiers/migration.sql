-- CreateEnum
CREATE TYPE "CraEntryModifier" AS ENUM ('TRAVEL', 'TRAINING', 'ON_CALL', 'OVERTIME');

-- AlterTable: add modifiers array and second_half_type columns
ALTER TABLE "cra_entries"
  ADD COLUMN "modifiers" "CraEntryModifier"[] NOT NULL DEFAULT '{}',
  ADD COLUMN "second_half_type" "CraEntryType";

-- Data migration: convert legacy standalone entryType values to WORK_ONSITE + modifier
UPDATE "cra_entries"
  SET "entry_type" = 'WORK_ONSITE', "modifiers" = ARRAY['TRAVEL']::"CraEntryModifier"[]
  WHERE "entry_type" = 'WORK_TRAVEL';

UPDATE "cra_entries"
  SET "entry_type" = 'WORK_ONSITE', "modifiers" = ARRAY['TRAINING']::"CraEntryModifier"[]
  WHERE "entry_type" = 'TRAINING';

UPDATE "cra_entries"
  SET "entry_type" = 'WORK_ONSITE', "modifiers" = ARRAY['ON_CALL']::"CraEntryModifier"[]
  WHERE "entry_type" = 'ASTREINTE';

UPDATE "cra_entries"
  SET "entry_type" = 'WORK_ONSITE', "modifiers" = ARRAY['OVERTIME']::"CraEntryModifier"[]
  WHERE "entry_type" = 'OVERTIME';
