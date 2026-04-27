ALTER TABLE "checkpoints" RENAME COLUMN "timestamp" TO "end_date";
--> statement-breakpoint
ALTER TABLE "checkpoints" ADD COLUMN "start_date" timestamp;
