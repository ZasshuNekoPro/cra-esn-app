-- CreateTable: report_validation_requests
-- Pipeline de validation des rapports mensuels (T1)

CREATE TABLE "report_validation_requests" (
    "id"          TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "year"        INTEGER NOT NULL,
    "month"       INTEGER NOT NULL,
    "report_type" TEXT NOT NULL,
    "recipient"   TEXT NOT NULL,
    "pdf_s3_key"  TEXT NOT NULL,
    "token"       TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "status"      TEXT NOT NULL DEFAULT 'PENDING',
    "comment"     TEXT,
    "resolved_by" TEXT,
    "expires_at"  TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_validation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_validation_requests_token_key" ON "report_validation_requests"("token");

-- CreateIndex
CREATE INDEX "report_validation_requests_employee_id_year_month_idx" ON "report_validation_requests"("employee_id", "year", "month");

-- CreateIndex
CREATE INDEX "report_validation_requests_token_idx" ON "report_validation_requests"("token");

-- AddForeignKey
ALTER TABLE "report_validation_requests"
    ADD CONSTRAINT "report_validation_requests_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
