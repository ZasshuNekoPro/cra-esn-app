-- CreateTable: mission_employees join table for multi-employee missions
CREATE TABLE "mission_employees" (
    "mission_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mission_employees_pkey" PRIMARY KEY ("mission_id","employee_id")
);

-- AddForeignKey
ALTER TABLE "mission_employees" ADD CONSTRAINT "mission_employees_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_employees" ADD CONSTRAINT "mission_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: populate join table from existing primary employee FK
INSERT INTO "mission_employees" ("mission_id", "employee_id", "created_at")
SELECT "id", "employee_id", CURRENT_TIMESTAMP FROM "missions";
