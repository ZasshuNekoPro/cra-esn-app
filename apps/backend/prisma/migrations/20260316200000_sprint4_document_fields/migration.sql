-- Sprint 4: Add revokedAt to DocumentShare and uploadedById to DocumentVersion

ALTER TABLE "document_shares" ADD COLUMN "revoked_at" TIMESTAMP(3);

ALTER TABLE "document_versions" ADD COLUMN "uploaded_by_id" TEXT;

ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_id_fkey"
  FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
