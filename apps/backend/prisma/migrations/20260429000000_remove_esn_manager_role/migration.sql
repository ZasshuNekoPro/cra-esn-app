-- Migrate all ESN_MANAGER users to ESN_ADMIN
UPDATE "users" SET "role" = 'ESN_ADMIN' WHERE "role" = 'ESN_MANAGER';

-- Migrate any validation requests targeting ESN_MANAGER to ESN_ADMIN
UPDATE "project_validation_requests" SET "target_role" = 'ESN_ADMIN' WHERE "target_role" = 'ESN_MANAGER';

-- Recreate Role enum without ESN_MANAGER (PostgreSQL cannot drop enum values directly)
CREATE TYPE "Role_new" AS ENUM ('PLATFORM_ADMIN', 'ESN_ADMIN', 'EMPLOYEE', 'CLIENT');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING "role"::text::"Role_new";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE'::"Role_new";

ALTER TABLE "project_validation_requests"
  ALTER COLUMN "target_role" TYPE "Role_new" USING "target_role"::text::"Role_new";

DROP TYPE "Role";

ALTER TYPE "Role_new" RENAME TO "Role";
