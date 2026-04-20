import simpleGit from "simple-git";
import { db } from "@/lib/db";
import {
  checkpointAnalyses,
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

function categorizeFile(filePath: string): "test" | "doc" | "cicd" | "code" {
  const lower = filePath.toLowerCase();

  if (
    lower.includes("test") ||
    lower.includes("spec") ||
    lower.includes("__tests__")
  ) {
    return "test";
  }

  if (
    lower.endsWith(".md") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".rst") ||
    lower.startsWith("docs/")
  ) {
    return "doc";
  }

  if (
    lower.startsWith(".github/") ||
    lower === "jenkinsfile" ||
    lower === "dockerfile" ||
    lower.startsWith("docker-compose") ||
    (lower.endsWith(".yml") && !lower.includes("/")) ||
    (lower.endsWith(".yaml") && !lower.includes("/"))
  ) {
    return "cicd";
  }

  return "code";
}

interface AuthorStats {
  code: FileStats;
  test: FileStats;
  doc: FileStats;
  cicd: FileStats;
  commitHashes: Set<string>;
}

function emptyAuthorStats(): AuthorStats {
  return {
    code: emptyStats(),
    test: emptyStats(),
    doc: emptyStats(),
    cicd: emptyStats(),
    commitHashes: new Set(),
  };
}

function parseGitLog(raw: string): Map<string, AuthorStats> {
  const authorMap = new Map<string, AuthorStats>();

  // Split into commits. Each commit starts with email|hash line.
  const lines = raw.split("\n");
  let currentEmail: string | null = null;
  let currentHash: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if this is a commit header line (email|hash)
    if (trimmed.includes("|") && !trimmed.includes("\t")) {
      const parts = trimmed.split("|");
      if (parts.length === 2 && parts[1].length >= 7) {
        currentEmail = parts[0].toLowerCase();
        currentHash = parts[1];

        if (!authorMap.has(currentEmail)) {
          authorMap.set(currentEmail, emptyAuthorStats());
        }
        const stats = authorMap.get(currentEmail)!;
        stats.commitHashes.add(currentHash);
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

        const category = categorizeFile(fileName);
        const stats = authorMap.get(currentEmail)!;
        const catStats = stats[category];
        catStats.linesAdded += added;
        catStats.linesRemoved += removed;
        catStats.filesChanged += 1;
      }
    }
  }

  // Set commits count from unique hashes
  for (const stats of authorMap.values()) {
    const totalCommits = stats.commitHashes.size;
    // Distribute commit count to code (represents overall commits)
    stats.code.commits = totalCommits;
  }

  return authorMap;
}

export async function analyzeCheckpoint(checkpointId: string) {
  // Fetch checkpoint
  const [checkpoint] = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.id, checkpointId));

  if (!checkpoint) throw new Error("Checkpoint not found");

  // Fetch all student groups for this course with students and repositories
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

        // Build git log command args
        const logArgs = ["log", "--format=%ae|%H", "--numstat", "--no-merges"];

        if (checkpoint.timestamp) {
          logArgs.push(`--until=${checkpoint.timestamp.toISOString()}`);
        }

        const logOutput = await repoGit.raw(logArgs);

        const authorStats = parseGitLog(logOutput);

        // Build email-to-student mapping
        const emailToStudent = new Map<string, (typeof groupStudents)[0]>();
        for (const student of groupStudents) {
          emailToStudent.set(student.email.toLowerCase(), student);
        }

        // Insert analysis for each student
        for (const student of groupStudents) {
          const stats = authorStats.get(student.email.toLowerCase());

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

          const docMetrics = stats
            ? {
                commits: 0,
                linesAdded: stats.doc.linesAdded,
                linesRemoved: stats.doc.linesRemoved,
                filesChanged: stats.doc.filesChanged,
              }
            : emptyStats();

          const cicdMetrics = stats
            ? {
                commits: 0,
                linesAdded: stats.cicd.linesAdded,
                linesRemoved: stats.cicd.linesRemoved,
                filesChanged: stats.cicd.filesChanged,
              }
            : emptyStats();

          await db.insert(checkpointAnalyses).values({
            checkpointId,
            studentId: student.id,
            repositoryId: repo.id,
            codeMetrics,
            testMetrics,
            docMetrics,
            cicdMetrics,
            reviewMetrics: { count: 0 },
            boardMetrics: {},
          });
        }
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }
}
