CREATE UNIQUE INDEX "grades_per_checkpoint_unique" ON "grades" ("student_id","category_id","checkpoint_id") WHERE "checkpoint_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "grades_standalone_unique" ON "grades" ("student_id","category_id") WHERE "checkpoint_id" IS NULL;
