import picomatch from "picomatch";
import simpleGit from "simple-git";
import { db } from "@/lib/db";
import {
  checkpointAnalyses,
  checkpointRepoMeta,
  students,
  repositories,
} from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import path from "path";
import os from "os";
import fs from "fs/promises";
import crypto from "crypto";
import type { PipelineContext } from "./types";

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
  let currentSkip = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

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
        const hash = parts[1];
        if (!authorMap.has(currentEmail)) {
          authorMap.set(currentEmail, emptyAuthorStats());
        }
        authorMap.get(currentEmail)!.commitHashes.add(hash);
        continue;
      }
    }

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

  for (const stats of authorMap.values()) {
    stats.code.commits = stats.commitHashes.size;
  }

  return authorMap;
}

export async function runContributionsPipeline(
  ctx: PipelineContext
): Promise<void> {
  const { checkpoint, group, ignoredEmails, log } = ctx;

  const groupStudents = await db
    .select()
    .from(students)
    .where(eq(students.groupId, group.id));

  const groupRepos = await db
    .select()
    .from(repositories)
    .where(eq(repositories.groupId, group.id));

  if (groupRepos.length === 0) {
    await log("warn", "No repositories found for this group");
    return;
  }

  // Clear any existing analysis data for this group's repos for this checkpoint
  const repoIds = groupRepos.map((r) => r.id);
  await db
    .delete(checkpointAnalyses)
    .where(
      and(
        eq(checkpointAnalyses.checkpointId, checkpoint.id),
        inArray(checkpointAnalyses.repositoryId, repoIds)
      )
    );
  await db
    .delete(checkpointRepoMeta)
    .where(
      and(
        eq(checkpointRepoMeta.checkpointId, checkpoint.id),
        inArray(checkpointRepoMeta.repositoryId, repoIds)
      )
    );

  for (const repo of groupRepos) {
    await log("info", `Cloning ${repo.url}`);
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
        await log("info", `Checking out ref ${checkpoint.gitRef}`);
        await repoGit.checkout(checkpoint.gitRef);
      }

      await log("info", "Running git log");
      const logArgs = [
        "log",
        "--use-mailmap",
        "--format=%aE|%H|%cI",
        "--numstat",
        "--no-merges",
      ];
      const logOutput = await repoGit.raw(logArgs);
      const authorMap = parseGitLog(
        logOutput,
        checkpoint.startDate ?? undefined,
        checkpoint.endDate ?? undefined
      );

      const registeredEmails = new Set(
        groupStudents.flatMap((s) => [
          s.email.toLowerCase(),
          ...s.gitEmails.map((e) => e.toLowerCase()),
        ])
      );

      const unidentifiedAuthors = [...authorMap.keys()].filter(
        (email) => !registeredEmails.has(email) && !ignoredEmails.has(email)
      );

      if (unidentifiedAuthors.length > 0) {
        await log(
          "warn",
          `Unidentified authors: ${unidentifiedAuthors.join(", ")}`
        );
      }

      await db.insert(checkpointRepoMeta).values({
        checkpointId: checkpoint.id,
        repositoryId: repo.id,
        unidentifiedAuthors,
      });

      for (const student of groupStudents) {
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

      await log("info", `Finished processing ${repo.url}`);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
