ALTER TABLE "checkpoint_logs" ADD COLUMN "repository_id" uuid REFERENCES "repositories"("id") ON DELETE CASCADE;
