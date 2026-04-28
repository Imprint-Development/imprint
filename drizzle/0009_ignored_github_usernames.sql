ALTER TABLE "courses" ADD COLUMN "ignored_github_usernames" text[] DEFAULT ARRAY[]::text[] NOT NULL;
