-- Track the current run token so active workers can detect when they have been
-- superseded by an abort or a new trigger and should stop writing data.
ALTER TABLE "checkpoints" ADD COLUMN "current_run_id" text;
