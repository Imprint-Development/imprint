-- Add AI analysis configuration to courses
ALTER TABLE "courses" ADD COLUMN "ai_analysis_config" jsonb NOT NULL DEFAULT '{"enabled":false,"provider":"openai","model":"gpt-4o","systemPrompt":""}'::jsonb;--> statement-breakpoint

-- AI-generated reports per student (and one group summary) per checkpoint run.
-- Multiple rows are kept intentionally so history is preserved across re-runs.
-- student_id IS NULL means it is a group-level summary report.
CREATE TABLE "ai_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkpoint_id" uuid NOT NULL REFERENCES "checkpoints"("id") ON DELETE CASCADE,
	"group_id" uuid NOT NULL REFERENCES "student_groups"("id") ON DELETE CASCADE,
	"student_id" uuid REFERENCES "students"("id") ON DELETE CASCADE,
	"content" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"system_prompt" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Add ungradedCheckpoints to grading_config default
ALTER TABLE "courses" ALTER COLUMN "grading_config" SET DEFAULT '{"categories":[],"gradeThresholds":[],"checkpointOverrides":{},"ungradedCheckpoints":[]}'::jsonb;
