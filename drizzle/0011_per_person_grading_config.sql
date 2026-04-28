-- Add grading configuration column to courses
ALTER TABLE "courses" ADD COLUMN "grading_config" jsonb NOT NULL DEFAULT '{"categories":[],"gradeThresholds":[]}'::jsonb;

-- Drop old group-based grades table
DROP TABLE "grades";

-- Create new per-person, per-category grades table
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid REFERENCES "students"("id") ON DELETE CASCADE,
	"category_id" text NOT NULL,
	"checkpoint_id" uuid REFERENCES "checkpoints"("id") ON DELETE CASCADE,
	"points" real NOT NULL,
	"notes" text,
	"graded_by" uuid REFERENCES "users"("id"),
	"created_at" timestamp DEFAULT now()
);

-- Partial unique index for per-checkpoint category grades
CREATE UNIQUE INDEX "grades_per_checkpoint_unique" ON "grades"("student_id","category_id","checkpoint_id") WHERE checkpoint_id IS NOT NULL;

-- Partial unique index for standalone (non-checkpoint) category grades
CREATE UNIQUE INDEX "grades_standalone_unique" ON "grades"("student_id","category_id") WHERE checkpoint_id IS NULL;
