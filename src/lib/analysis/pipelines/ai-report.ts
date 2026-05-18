import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import simpleGit from "simple-git";
import path from "path";
import os from "os";
import fs from "fs/promises";
import crypto from "crypto";
import { db } from "@/lib/db";
import {
  courses,
  students,
  repositories,
  checkpointAnalyses,
  aiReports,
  DEFAULT_AI_SYSTEM_PROMPT,
} from "@/lib/db/schema";
import type { AiAnalysisConfig } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { PipelineContext } from "./types";

// ---------------------------------------------------------------------------
// Model catalogue
// ---------------------------------------------------------------------------

export { OPENAI_MODELS, ANTHROPIC_MODELS } from "./ai-report-constants";

// ---------------------------------------------------------------------------
// LLM caller — configurable base URL so the user can point at OpenRouter,
// a local Ollama instance, or any OpenAI-compatible endpoint.
// ---------------------------------------------------------------------------

export async function callLlm(
  provider: "openai" | "anthropic",
  model: string,
  systemPrompt: string,
  userMessage: string,
  baseUrl?: string
): Promise<string> {
  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY environment variable not set");

    const client = new OpenAI({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    });

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    console.log(
      `[ai-report][openai] finish_reason=${response.choices[0]?.finish_reason} choices=${response.choices.length}`
    );

    return response.choices[0]?.message?.content ?? "";
  }

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
      throw new Error("ANTHROPIC_API_KEY environment variable not set");

    const clientOptions: ConstructorParameters<typeof Anthropic>[0] = {
      apiKey,
    };
    if (baseUrl) {
      // Anthropic SDK requires baseURL without a trailing slash
      clientOptions.baseURL = baseUrl.replace(/\/$/, "");
    }

    const client = new Anthropic(clientOptions);

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    console.log(
      `[ai-report][anthropic] stop_reason=${response.stop_reason} content_blocks=${response.content.length} types=${response.content.map((b) => b.type).join(",")}`
    );

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.type === "text" ? textBlock.text : "";
  }

  throw new Error(`Unknown provider: ${provider}`);
}

// ---------------------------------------------------------------------------
// Metrics formatting helpers
// ---------------------------------------------------------------------------

export type Metrics = Record<string, number> | null;

export function formatMetrics(
  studentName: string,
  codeMetrics: Metrics,
  testMetrics: Metrics,
  reviewMetrics: Metrics
): string {
  const lines: string[] = [`Student: ${studentName}`];

  if (codeMetrics && Object.keys(codeMetrics).length > 0) {
    lines.push(
      `Code contributions: ${codeMetrics.commits ?? 0} commits, ` +
        `+${codeMetrics.linesAdded ?? 0} / -${codeMetrics.linesRemoved ?? 0} lines, ` +
        `${codeMetrics.filesChanged ?? 0} files changed`
    );
  } else {
    lines.push("Code contributions: no data");
  }

  if (testMetrics && Object.keys(testMetrics).length > 0) {
    lines.push(
      `Test contributions: ${testMetrics.commits ?? 0} commits, ` +
        `+${testMetrics.linesAdded ?? 0} / -${testMetrics.linesRemoved ?? 0} lines`
    );
  } else {
    lines.push("Test contributions: no data");
  }

  if (reviewMetrics && Object.keys(reviewMetrics).length > 0) {
    lines.push(
      `Review activity: ${reviewMetrics.prsReviewed ?? 0} PRs reviewed, ` +
        `${reviewMetrics.approvals ?? 0} approvals, ` +
        `${reviewMetrics.changesRequested ?? 0} change requests, ` +
        `${reviewMetrics.reviewComments ?? 0} review comments, ` +
        `${reviewMetrics.issueComments ?? 0} issue comments`
    );
  } else {
    lines.push("Review activity: no data");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Git context extraction
// ---------------------------------------------------------------------------

/** Glob patterns for files that are never meaningful to diff. */
const IGNORED_FILE_PATTERNS = [
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /composer\.lock$/,
  /Gemfile\.lock$/,
  /poetry\.lock$/,
  /\.min\.(js|css)$/,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)\.next\//,
  /(^|\/)__generated__\//,
  /(^|\/)coverage\//,
  /\.map$/,
  /\.snap$/, // jest snapshots — usually auto-generated
];

const MAX_COMMITS_PER_STUDENT = 100;
const MAX_DIFF_LINES_PER_COMMIT = 150;

function isIgnoredFile(filePath: string): boolean {
  return IGNORED_FILE_PATTERNS.some((re) => re.test(filePath));
}

/**
 * Strips hunks for ignored files from a unified diff and truncates
 * the result to MAX_DIFF_LINES_PER_COMMIT lines.
 */
function processDiff(rawDiff: string): { diff: string; truncated: boolean } {
  const lines = rawDiff.split("\n");
  const filtered: string[] = [];
  let skip = false;

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      // Determine the file path from "diff --git a/foo b/foo"
      const match = line.match(/diff --git a\/.+ b\/(.+)$/);
      skip = match ? isIgnoredFile(match[1]!) : false;
    }
    if (!skip) filtered.push(line);
  }

  if (filtered.length <= MAX_DIFF_LINES_PER_COMMIT) {
    return { diff: filtered.join("\n"), truncated: false };
  }
  return {
    diff:
      filtered.slice(0, MAX_DIFF_LINES_PER_COMMIT).join("\n") +
      `\n… (truncated, ${filtered.length - MAX_DIFF_LINES_PER_COMMIT} more lines)`,
    truncated: true,
  };
}

export interface RepoGitContext {
  repoUrl: string;
  /** Commits by each student, with message, stat summary and filtered diff. */
  commitsByStudent: Record<
    string,
    {
      hash: string;
      date: string;
      message: string;
      stat: string;
      diff: string;
    }[]
  >;
  /** Files changed by each student (deduplicated) */
  filesByStudent: Record<string, string[]>;
  /** Full file tree at the checkout ref */
  fileTree: string;
}

/**
 * Clones `repoUrl`, checks out `gitRef`, then extracts per-student commit
 * history (with full diffs) and the file tree within the checkpoint date window.
 * Returns null (and logs a warning) if the clone fails.
 */
export async function extractRepoGitContext(
  repoUrl: string,
  gitRef: string | null,
  startDate: Date | null,
  endDate: Date | null,
  studentEmailMap: Map<string, string[]>, // studentId -> [emails]
  log: (level: "info" | "warn" | "error", msg: string) => Promise<void>
): Promise<RepoGitContext | null> {
  const tmpDir = path.join(
    os.tmpdir(),
    `imprint-ai-${crypto.randomBytes(8).toString("hex")}`
  );

  try {
    await fs.mkdir(tmpDir, { recursive: true });
    await log("info", `Cloning ${repoUrl} for AI context extraction`);

    const git = simpleGit();
    await git.clone(repoUrl, tmpDir);
    const repoGit = simpleGit(tmpDir);

    if (gitRef) {
      await repoGit.checkout(gitRef);
    }

    // Build date range flags
    const dateFlags: string[] = [];
    if (startDate) dateFlags.push(`--after=${startDate.toISOString()}`);
    if (endDate) dateFlags.push(`--before=${endDate.toISOString()}`);

    // Build a map from email -> studentId for fast lookup
    const emailToStudentId = new Map<string, string>();
    for (const [studentId, emails] of studentEmailMap) {
      for (const email of emails) {
        emailToStudentId.set(email.toLowerCase(), studentId);
      }
    }

    // Fetch all commits in the window with author email, hash, date, subject
    const rawLog = await repoGit.raw([
      "log",
      "--use-mailmap",
      "--format=%aE|||%H|||%cI|||%s",
      "--no-merges",
      ...dateFlags,
    ]);

    const commitsByStudent: RepoGitContext["commitsByStudent"] = {};
    const filesByStudent: Record<string, Set<string>> = {};

    const commitLines = rawLog
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of commitLines) {
      const [email, hash, date, ...subjectParts] = line.split("|||");
      if (!email || !hash) continue;
      const studentId = emailToStudentId.get(email.toLowerCase());
      if (!studentId) continue;

      if (!commitsByStudent[studentId]) commitsByStudent[studentId] = [];

      // Cap at MAX_COMMITS_PER_STUDENT — git log returns newest-first so we
      // hit this cap naturally and drop the oldest excess commits.
      if (commitsByStudent[studentId].length >= MAX_COMMITS_PER_STUDENT)
        continue;

      const subject = subjectParts.join("|||").trim();

      // Full unified diff for the commit (includes stat header)
      const rawDiff = await repoGit.raw([
        "show",
        "--patch",
        "--stat",
        "--no-color",
        hash,
      ]);

      // Extract the --stat summary line (last non-empty line before the diff)
      const statLines = rawDiff
        .split("\n")
        .slice(0, rawDiff.indexOf("\ndiff --git") > -1 ? undefined : undefined)
        .map((l) => l.trim())
        .filter((l) => l.match(/\d+ file/));
      const stat = statLines[statLines.length - 1] ?? "";

      const { diff } = processDiff(rawDiff);

      // Collect changed files (from diff --git headers)
      const changedFiles = [...rawDiff.matchAll(/^diff --git a\/.+ b\/(.+)$/gm)]
        .map((m) => m[1]!)
        .filter((f) => !isIgnoredFile(f));

      commitsByStudent[studentId].push({
        hash: hash.slice(0, 8),
        date: date ?? "",
        message: subject,
        stat,
        diff,
      });

      if (!filesByStudent[studentId]) filesByStudent[studentId] = new Set();
      for (const f of changedFiles) filesByStudent[studentId].add(f);
    }

    // File tree at HEAD (just paths, no content)
    const treeRaw = await repoGit.raw(["ls-tree", "-r", "--name-only", "HEAD"]);
    const fileTree = treeRaw.trim();

    const studentCount = Object.keys(commitsByStudent).length;
    const totalCommits = Object.values(commitsByStudent).reduce(
      (s, c) => s + c.length,
      0
    );
    await log(
      "info",
      `Git context extracted: ${commitLines.length} commits scanned, ${totalCommits} matched to ${studentCount} students`
    );

    return {
      repoUrl,
      commitsByStudent,
      filesByStudent: Object.fromEntries(
        Object.entries(filesByStudent).map(([k, v]) => [k, [...v]])
      ),
      fileTree,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await log("warn", `Failed to extract git context from ${repoUrl}: ${msg}`);
    return null;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Formats the git context for a single student into a readable string
 * for inclusion in the LLM prompt.
 */
export function formatGitContext(
  studentId: string,
  context: RepoGitContext
): string {
  const commits = context.commitsByStudent[studentId] ?? [];
  const files = context.filesByStudent[studentId] ?? [];

  if (commits.length === 0)
    return "No commits found for this student in the checkpoint window.";

  const lines: string[] = [];
  lines.push(`Commits (${commits.length} total):`);
  for (const c of commits) {
    lines.push(`\n[${c.hash}] ${c.date.slice(0, 10)} — ${c.message}`);
    if (c.stat) lines.push(`  ${c.stat}`);
    if (c.diff) lines.push(c.diff);
  }

  if (files.length > 0) {
    lines.push(`\nFiles touched (${files.length} unique):`);
    const shown = files.slice(0, 60);
    for (const f of shown) lines.push(`  ${f}`);
    if (files.length > 60) lines.push(`  … and ${files.length - 60} more`);
  }

  return lines.join("\n");
}

/**
 * Formats the repository file tree, capped to avoid token bloat.
 */
export function formatFileTree(fileTree: string, maxLines = 200): string {
  const lines = fileTree.split("\n").filter(Boolean);
  if (lines.length <= maxLines) return lines.join("\n");
  return (
    lines.slice(0, maxLines).join("\n") +
    `\n… (${lines.length - maxLines} more files)`
  );
}

// ---------------------------------------------------------------------------
// Pipeline entry point
// ---------------------------------------------------------------------------

export async function runAiReportPipeline(
  context: PipelineContext
): Promise<void> {
  const { checkpoint, group, log } = context;

  // 1. Load the course config
  const [course] = await db
    .select({ aiAnalysisConfig: courses.aiAnalysisConfig })
    .from(courses)
    .where(eq(courses.id, checkpoint.courseId))
    .limit(1);

  const config: AiAnalysisConfig = course?.aiAnalysisConfig ?? {
    enabled: false,
    provider: "openai",
    model: "gpt-4o",
    systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
  };

  if (!config.enabled) {
    await log(
      "info",
      "AI analysis is disabled for this course — skipping ai-report pipeline"
    );
    return;
  }

  // Verify the API key is present before doing any work
  const keyVar =
    config.provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
  if (!process.env[keyVar]) {
    await log(
      "error",
      `${keyVar} environment variable is not set — cannot run ai-report pipeline`
    );
    return;
  }

  const effectiveSystemPrompt =
    config.systemPrompt?.trim() || DEFAULT_AI_SYSTEM_PROMPT;

  await log(
    "info",
    `Running AI report pipeline using ${config.provider}/${config.model}${config.baseUrl ? ` (base URL: ${config.baseUrl})` : ""}`
  );

  // 2. Fetch group repos
  const groupRepos = await db
    .select()
    .from(repositories)
    .where(eq(repositories.groupId, group.id));

  if (groupRepos.length === 0) {
    await log("warn", "No repositories found for this group — skipping");
    return;
  }

  const repoIds = groupRepos.map((r) => r.id);

  // 3. Fetch all analysis rows for this group + checkpoint
  const analyses = await db
    .select({
      studentId: checkpointAnalyses.studentId,
      studentName: students.displayName,
      studentEmail: students.email,
      studentGitEmails: students.gitEmails,
      codeMetrics: checkpointAnalyses.codeMetrics,
      testMetrics: checkpointAnalyses.testMetrics,
      reviewMetrics: checkpointAnalyses.reviewMetrics,
    })
    .from(checkpointAnalyses)
    .innerJoin(students, eq(students.id, checkpointAnalyses.studentId))
    .where(
      and(
        eq(checkpointAnalyses.checkpointId, checkpoint.id),
        inArray(checkpointAnalyses.repositoryId, repoIds)
      )
    );

  if (analyses.length === 0) {
    await log(
      "warn",
      "No contribution data found for this group — run the contributions pipeline first"
    );
    return;
  }

  // Deduplicate by studentId (a student may appear in multiple repos)
  const byStudent = new Map<
    string,
    {
      studentName: string;
      studentEmail: string;
      studentGitEmails: string[];
      codeMetrics: Metrics;
      testMetrics: Metrics;
      reviewMetrics: Metrics;
    }
  >();

  for (const row of analyses) {
    if (!row.studentId) continue;
    const existing = byStudent.get(row.studentId);
    if (!existing) {
      byStudent.set(row.studentId, {
        studentName: row.studentName,
        studentEmail: row.studentEmail,
        studentGitEmails: (row.studentGitEmails as string[]) ?? [],
        codeMetrics: row.codeMetrics as Metrics,
        testMetrics: row.testMetrics as Metrics,
        reviewMetrics: row.reviewMetrics as Metrics,
      });
    } else {
      // Aggregate metrics across repos for the same student
      const add = (a: Metrics, b: Metrics): Metrics => {
        if (!a && !b) return null;
        const result: Record<string, number> = {};
        const keys = new Set([
          ...Object.keys(a ?? {}),
          ...Object.keys(b ?? {}),
        ]);
        for (const k of keys) {
          result[k] =
            ((a as Record<string, number>)?.[k] ?? 0) +
            ((b as Record<string, number>)?.[k] ?? 0);
        }
        return result;
      };
      byStudent.set(row.studentId, {
        studentName: existing.studentName,
        studentEmail: existing.studentEmail,
        studentGitEmails: existing.studentGitEmails,
        codeMetrics: add(existing.codeMetrics, row.codeMetrics as Metrics),
        testMetrics: add(existing.testMetrics, row.testMetrics as Metrics),
        reviewMetrics: add(
          existing.reviewMetrics,
          row.reviewMetrics as Metrics
        ),
      });
    }
  }

  const studentEntries = Array.from(byStudent.entries());

  // Build email map for git context extraction
  const studentEmailMap = new Map<string, string[]>(
    studentEntries.map(([studentId, data]) => [
      studentId,
      [data.studentEmail, ...data.studentGitEmails],
    ])
  );

  // 4. Extract git context from each repo (one clone per repo)
  const gitContexts: RepoGitContext[] = [];
  for (const repo of groupRepos) {
    const ctx = await extractRepoGitContext(
      repo.url,
      checkpoint.gitRef,
      checkpoint.startDate,
      checkpoint.endDate,
      studentEmailMap,
      log
    );
    if (ctx) gitContexts.push(ctx);
  }

  // Merge git contexts across repos per student
  const mergedCommits: Record<
    string,
    {
      hash: string;
      date: string;
      message: string;
      stat: string;
      diff: string;
    }[]
  > = {};
  const mergedFiles: Record<string, Set<string>> = {};
  const allFileTrees: string[] = [];

  for (const ctx of gitContexts) {
    for (const [studentId, commits] of Object.entries(ctx.commitsByStudent)) {
      if (!mergedCommits[studentId]) mergedCommits[studentId] = [];
      mergedCommits[studentId].push(...commits);
    }
    for (const [studentId, files] of Object.entries(ctx.filesByStudent)) {
      if (!mergedFiles[studentId]) mergedFiles[studentId] = new Set();
      for (const f of files) mergedFiles[studentId].add(f);
    }
    if (ctx.fileTree) allFileTrees.push(ctx.fileTree);
  }

  const mergedFileTree = [
    ...new Set(allFileTrees.join("\n").split("\n").filter(Boolean)),
  ].join("\n");

  const mergedGitContext: RepoGitContext = {
    repoUrl: groupRepos.map((r) => r.url).join(", "),
    commitsByStudent: mergedCommits,
    filesByStudent: Object.fromEntries(
      Object.entries(mergedFiles).map(([k, v]) => [k, [...v]])
    ),
    fileTree: mergedFileTree,
  };

  // 5. Generate per-student reports
  await log("info", `Generating reports for ${studentEntries.length} students`);

  // Collect all generated reports in memory; insert them all at once at the end
  // so either every report for the group is persisted or none are.
  const reportValues: (typeof aiReports.$inferInsert)[] = [];

  const studentReportParts: string[] = [];

  for (const [studentId, data] of studentEntries) {
    await log("info", `Generating report for ${data.studentName}…`);
    try {
      const metricsSection = formatMetrics(
        data.studentName,
        data.codeMetrics,
        data.testMetrics,
        data.reviewMetrics
      );
      const gitSection = formatGitContext(studentId, mergedGitContext);
      const repoTreeSection = mergedGitContext.fileTree
        ? `\nRepository file tree:\n${formatFileTree(mergedGitContext.fileTree)}`
        : "";

      const userMessage =
        `Generate a contribution report for the following student in group "${group.name}".\n\n` +
        `## Aggregated metrics\n${metricsSection}\n\n` +
        `## Git history\n${gitSection}` +
        repoTreeSection;

      await log(
        "info",
        `Calling ${config.provider} API (model: ${config.model}, prompt: ${userMessage.length} chars)`
      );

      const content = await callLlm(
        config.provider,
        config.model,
        effectiveSystemPrompt,
        userMessage,
        config.baseUrl
      );

      if (!content) {
        await log("warn", `LLM returned empty content for ${data.studentName}`);
      } else {
        await log(
          "info",
          `Received response (${content.length} chars) for ${data.studentName}`
        );
      }

      reportValues.push({
        checkpointId: checkpoint.id,
        groupId: group.id,
        studentId,
        content,
        provider: config.provider,
        model: config.model,
        systemPrompt: effectiveSystemPrompt,
      });

      studentReportParts.push(`### ${data.studentName}\n\n${metricsSection}`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? `${err.message}${err.cause ? ` (cause: ${err.cause})` : ""}`
          : JSON.stringify(err);
      await log(
        "error",
        `Failed to generate report for ${data.studentName}: ${msg}`
      );
      console.error(`[ai-report] Error for student ${data.studentName}:`, err);
    }
  }

  // 6. Generate group summary
  await log("info", "Generating group summary report");
  try {
    const groupMessage =
      `Write a group-level summary report for group "${group.name}". ` +
      `For each student, briefly characterise their contribution, then close with an overall assessment of group health and collaboration.\n\n` +
      studentEntries
        .map(([studentId, data]) => {
          const metrics = formatMetrics(
            data.studentName,
            data.codeMetrics,
            data.testMetrics,
            data.reviewMetrics
          );
          const git = formatGitContext(studentId, mergedGitContext);
          return `## ${data.studentName}\n${metrics}\n\nGit history:\n${git}`;
        })
        .join("\n\n---\n\n");

    await log(
      "info",
      `Calling ${config.provider} API for group summary (model: ${config.model}, prompt: ${groupMessage.length} chars)`
    );

    const groupContent = await callLlm(
      config.provider,
      config.model,
      effectiveSystemPrompt,
      groupMessage,
      config.baseUrl
    );

    if (!groupContent) {
      await log("warn", "LLM returned empty content for group summary");
    } else {
      await log(
        "info",
        `Received group summary (${groupContent.length} chars)`
      );
    }

    reportValues.push({
      checkpointId: checkpoint.id,
      groupId: group.id,
      studentId: null,
      content: groupContent,
      provider: config.provider,
      model: config.model,
      systemPrompt: effectiveSystemPrompt,
    });
  } catch (err) {
    const msg =
      err instanceof Error
        ? `${err.message}${err.cause ? ` (cause: ${err.cause})` : ""}`
        : JSON.stringify(err);
    await log("error", `Failed to generate group summary: ${msg}`);
    console.error(`[ai-report] Error generating group summary:`, err);
  }

  // Persist all collected reports atomically — either all reports for this group
  // are written or none are. Chunked inserts keep each statement within the
  // PostgreSQL parameter limit.
  if (reportValues.length > 0) {
    const CHUNK = 500;
    await db.transaction(async (tx) => {
      for (let i = 0; i < reportValues.length; i += CHUNK)
        await tx.insert(aiReports).values(reportValues.slice(i, i + CHUNK));
    });
  }

  await log("info", "AI report pipeline complete");
}
