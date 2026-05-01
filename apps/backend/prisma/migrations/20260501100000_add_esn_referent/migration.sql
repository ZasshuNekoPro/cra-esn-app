-- AddColumn: esn_referent_id on users (self-referential FK)
ALTER TABLE "users" ADD COLUMN "esn_referent_id" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_esn_referent_id_fkey"
  FOREIGN KEY ("esn_referent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddColumn: can_see_all_esn_reports on users (vacation-coverage flag for ESN_ADMIN)
ALTER TABLE "users" ADD COLUMN "can_see_all_esn_reports" BOOLEAN NOT NULL DEFAULT false;
