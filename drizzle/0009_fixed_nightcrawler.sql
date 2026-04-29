ALTER TABLE "accounts" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "provider" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "provider_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "checkpoint_logs" ADD COLUMN "repository_id" uuid;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "ignored_github_usernames" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "github_username" text;--> statement-breakpoint
ALTER TABLE "checkpoint_logs" ADD CONSTRAINT "checkpoint_logs_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;