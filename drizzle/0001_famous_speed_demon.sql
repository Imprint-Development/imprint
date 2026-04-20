CREATE TABLE "checkpoint_repo_meta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkpoint_id" uuid NOT NULL,
	"repository_id" uuid NOT NULL,
	"unidentified_authors" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkpoint_repo_meta" ADD CONSTRAINT "checkpoint_repo_meta_checkpoint_id_checkpoints_id_fk" FOREIGN KEY ("checkpoint_id") REFERENCES "public"."checkpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoint_repo_meta" ADD CONSTRAINT "checkpoint_repo_meta_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;