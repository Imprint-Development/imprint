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
  courses,
} from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
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

function parseGitLog(
  raw: string,
  since?: Date,
  until?: Date
): Map<string, AuthorStats> {
  const authorMap = new Map<string, AuthorStats>();

  const lines = raw.split("\n");
  let currentEmail: string | null = null;
  let currentHash: string | null = null;
  let currentSkip = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Commit header line: email|hash|committerISO
    if (trimmed.includes("|") && !trimmed.includes("\t")) {
      const parts = trimmed.split("|");
      if (parts.length === 3 && parts[1].length >= 7) {
        const committerDate = new Date(parts[2]);
        currentSkip = !!(
          (until && committerDate > until) ||
          (since && committerDate < since)
        );

        if (currentSkip) continue;

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
    if (!currentSkip && currentEmail && trimmed.includes("\t")) {
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

interface GroupRecord {
  id: string;
}

interface CheckpointRecord {
  id: string;
  gitRef: string | null;
  startDate: Date | null;
  endDate: Date | null;
}

async function analyzeGroupForCheckpoint(
  checkpoint: CheckpointRecord,
  group: GroupRecord,
  ignoredEmails: Set<string>
) {
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

      const logArgs = [
        "log",
        "--use-mailmap",
        "--format=%aE|%H|%cI",
        "--numstat",
        "--no-merges",
      ];

      if (checkpoint.gitRef) {
        await repoGit.checkout(checkpoint.gitRef);
      }

      const logOutput = await repoGit.raw(logArgs);
      const authorMap = parseGitLog(
        logOutput,
        checkpoint.startDate ?? undefined,
        checkpoint.endDate ?? undefined
      );

      // Build email-to-student mapping (primary email + gitEmails aliases)
      const registeredEmails = new Set(
        groupStudents.flatMap((s) => [
          s.email.toLowerCase(),
          ...s.gitEmails.map((e) => e.toLowerCase()),
        ])
      );

      // Unidentified authors: in git log, not a registered student, not ignored
      const unidentifiedAuthors = [...authorMap.keys()].filter(
        (email) => !registeredEmails.has(email) && !ignoredEmails.has(email)
      );

      // Write per-repo metadata
      await db.insert(checkpointRepoMeta).values({
        checkpointId: checkpoint.id,
        repositoryId: repo.id,
        unidentifiedAuthors,
      });

      // Insert analysis for each student
      for (const student of groupStudents) {
        // Try primary email first, then any gitEmails aliases
        const allEmails = [
          student.email.toLowerCase(),
          ...student.gitEmails.map((e) => e.toLowerCase()),
        ];
        const stats = allEmails
          .map((e) => authorMap.get(e))
          .find((s) => s !== undefined);

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
          checkpointId: checkpoint.id,
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

export async function analyzeCheckpoint(checkpointId: string) {
  const [checkpoint] = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.id, checkpointId));

  if (!checkpoint) throw new Error("Checkpoint not found");

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, checkpoint.courseId));

  const ignoredEmails = new Set(
    (course?.ignoredGitEmails ?? []).map((e) => e.toLowerCase())
  );

  const groups = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.courseId, checkpoint.courseId));

  for (const group of groups) {
    await analyzeGroupForCheckpoint(checkpoint, group, ignoredEmails);
  }
}

export async function analyzeCheckpointForGroup(
  checkpointId: string,
  groupId: string
) {
  const [checkpoint] = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.id, checkpointId));

  if (!checkpoint) throw new Error("Checkpoint not found");

  const [group] = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.id, groupId));

  if (!group) throw new Error("Group not found");

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, checkpoint.courseId));

  const ignoredEmails = new Set(
    (course?.ignoredGitEmails ?? []).map((e) => e.toLowerCase())
  );

  // Clear existing analysis data for this group's repos
  const groupRepos = await db
    .select()
    .from(repositories)
    .where(eq(repositories.groupId, groupId));

  if (groupRepos.length > 0) {
    const repoIds = groupRepos.map((r) => r.id);

    await db
      .delete(checkpointAnalyses)
      .where(
        and(
          eq(checkpointAnalyses.checkpointId, checkpointId),
          inArray(checkpointAnalyses.repositoryId, repoIds)
        )
      );

    await db
      .delete(checkpointRepoMeta)
      .where(
        and(
          eq(checkpointRepoMeta.checkpointId, checkpointId),
          inArray(checkpointRepoMeta.repositoryId, repoIds)
        )
      );
  }

  await analyzeGroupForCheckpoint(checkpoint, group, ignoredEmails);
}
