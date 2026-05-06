ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'active';
--> statement-breakpoint
CREATE TABLE "system_settings" (
"key" text PRIMARY KEY NOT NULL,
"value" jsonb NOT NULL
);
