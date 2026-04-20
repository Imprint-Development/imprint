import picomatch from "picomatch";
import simpleGit from "simple-git";
import { db } from "@/lib/db";
import {
  checkpointAnalyses,
  checkpointRepoMeta,
  students,
  repositories,
  studentGroups,
  checkpoints,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import path from "path";
import os from "os";
import fs from "fs/promises";
import crypto from "crypto";

interface FileStats {
  commits: number;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
}

function emptyStats(): FileStats {
  return { commits: 0, linesAdded: 0, linesRemoved: 0, filesChanged: 0 };
}

const isTestFile = picomatch([
  "**/*.test.*",
  "**/*.spec.*",
  "**/__tests__/**",
  "**/test/**",
]);

interface AuthorStats {
  code: FileStats;
  test: FileStats;
  commitHashes: Set<string>;
}

function emptyAuthorStats(): AuthorStats {
  return {
    code: emptyStats(),
    test: emptyStats(),
    commitHashes: new Set(),
  };
}

function parseGitLog(raw: string): Map<string, AuthorStats> {
  const authorMap = new Map<string, AuthorStats>();

  const lines = raw.split("\n");
  let currentEmail: string | null = null;
  let currentHash: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Commit header line: email|hash
    if (trimmed.includes("|") && !trimmed.includes("\t")) {
      const parts = trimmed.split("|");
      if (parts.length === 2 && parts[1].length >= 7) {
        currentEmail = parts[0].toLowerCase();
        currentHash = parts[1];

        if (!authorMap.has(currentEmail)) {
          authorMap.set(currentEmail, emptyAuthorStats());
        }
        authorMap.get(currentEmail)!.commitHashes.add(currentHash);
        continue;
      }
    }

    // numstat line: added\tremoved\tfilename
    if (currentEmail && trimmed.includes("\t")) {
      const parts = trimmed.split("\t");
      if (parts.length >= 3) {
        const added = parts[0] === "-" ? 0 : parseInt(parts[0], 10) || 0;
        const removed = parts[1] === "-" ? 0 : parseInt(parts[1], 10) || 0;
        const fileName = parts.slice(2).join("\t");

        const stats = authorMap.get(currentEmail)!;
        const bucket = isTestFile(fileName) ? stats.test : stats.code;
        bucket.linesAdded += added;
        bucket.linesRemoved += removed;
        bucket.filesChanged += 1;
      }
    }
  }

  // Set commit count from unique hashes (stored on code bucket)
  for (const stats of authorMap.values()) {
    stats.code.commits = stats.commitHashes.size;
  }

  return authorMap;
}

export async function analyzeCheckpoint(checkpointId: string) {
  const [checkpoint] = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.id, checkpointId));

  if (!checkpoint) throw new Error("Checkpoint not found");

  const groups = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.courseId, checkpoint.courseId));

  for (const group of groups) {
    const groupStudents = await db
      .select()
      .from(students)
      .where(eq(students.groupId, group.id));

    const groupRepos = await db
      .select()
      .from(repositories)
      .where(eq(repositories.groupId, group.id));

    for (const repo of groupRepos) {
      const tmpDir = path.join(
        os.tmpdir(),
        `imprint-analysis-${crypto.randomBytes(8).toString("hex")}`
      );

      try {
        await fs.mkdir(tmpDir, { recursive: true });

        const git = simpleGit();
        await git.clone(repo.url, tmpDir);

        const repoGit = simpleGit(tmpDir);

        if (checkpoint.gitRef) {
          await repoGit.checkout(checkpoint.gitRef);
        }

        const logArgs = [
          "log",
          "--use-mailmap",
          "--format=%aE|%H",
          "--numstat",
          "--no-merges",
        ];

        if (checkpoint.timestamp) {
          logArgs.push(`--until=${checkpoint.timestamp.toISOString()}`);
        }

        const logOutput = await repoGit.raw(logArgs);
        const authorMap = parseGitLog(logOutput);

        // Build email-to-student mapping
        const registeredEmails = new Set(
          groupStudents.map((s) => s.email.toLowerCase())
        );

        // Unidentified authors: in git log but not a registered student
        const unidentifiedAuthors = [...authorMap.keys()].filter(
          (email) => !registeredEmails.has(email)
        );

        // Write per-repo metadata
        await db.insert(checkpointRepoMeta).values({
          checkpointId,
          repositoryId: repo.id,
          unidentifiedAuthors,
        });

        // Insert analysis for each student
        for (const student of groupStudents) {
          const stats = authorMap.get(student.email.toLowerCase());

          const codeMetrics = stats
            ? {
                commits: stats.code.commits,
                linesAdded: stats.code.linesAdded,
                linesRemoved: stats.code.linesRemoved,
                filesChanged: stats.code.filesChanged,
              }
            : emptyStats();

          const testMetrics = stats
            ? {
                commits: 0,
                linesAdded: stats.test.linesAdded,
                linesRemoved: stats.test.linesRemoved,
                filesChanged: stats.test.filesChanged,
              }
            : emptyStats();

          await db.insert(checkpointAnalyses).values({
            checkpointId,
            studentId: student.id,
            repositoryId: repo.id,
            codeMetrics,
            testMetrics,
            docMetrics: null,
            cicdMetrics: null,
            reviewMetrics: null,
            boardMetrics: null,
          });
        }
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }
}
