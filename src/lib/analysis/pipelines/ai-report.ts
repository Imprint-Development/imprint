import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
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

export const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o mini" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "o1", label: "o1" },
  { value: "o1-mini", label: "o1 mini" },
] as const;

export const ANTHROPIC_MODELS = [
  { value: "claude-opus-4-5", label: "Claude Opus 4.5" },
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
] as const;

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

    return response.choices[0]?.message?.content ?? "";
  }

  if (provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
      throw new Error("ANTHROPIC_API_KEY environment variable not set");

    const client = new Anthropic({
      apiKey,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    });

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const block = response.content[0];
    return block?.type === "text" ? block.text : "";
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
    `Running AI report pipeline using ${config.provider}/${config.model}`
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

  // 4. Generate per-student reports
  await log("info", `Generating reports for ${studentEntries.length} students`);

  const studentReportParts: string[] = [];

  for (const [studentId, data] of studentEntries) {
    await log("info", `Generating report for ${data.studentName}`);
    try {
      const userMessage =
        `Generate a contribution report for the following student in group "${group.name}".\n\n` +
        formatMetrics(
          data.studentName,
          data.codeMetrics,
          data.testMetrics,
          data.reviewMetrics
        );

      const content = await callLlm(
        config.provider,
        config.model,
        effectiveSystemPrompt,
        userMessage,
        config.baseUrl
      );

      await db.insert(aiReports).values({
        checkpointId: checkpoint.id,
        groupId: group.id,
        studentId,
        content,
        provider: config.provider,
        model: config.model,
        systemPrompt: effectiveSystemPrompt,
      });

      studentReportParts.push(
        `### ${data.studentName}\n\n` +
          formatMetrics(
            data.studentName,
            data.codeMetrics,
            data.testMetrics,
            data.reviewMetrics
          )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await log(
        "error",
        `Failed to generate report for ${data.studentName}: ${msg}`
      );
    }
  }

  // 5. Generate group summary
  await log("info", "Generating group summary report");
  try {
    const groupMessage =
      `Write a group-level summary report for group "${group.name}". ` +
      `For each student, briefly characterise their contribution, then close with an overall assessment of group health and collaboration.\n\n` +
      studentEntries
        .map(([, data]) =>
          formatMetrics(
            data.studentName,
            data.codeMetrics,
            data.testMetrics,
            data.reviewMetrics
          )
        )
        .join("\n\n---\n\n");

    const groupContent = await callLlm(
      config.provider,
      config.model,
      effectiveSystemPrompt,
      groupMessage,
      config.baseUrl
    );

    await db.insert(aiReports).values({
      checkpointId: checkpoint.id,
      groupId: group.id,
      studentId: null,
      content: groupContent,
      provider: config.provider,
      model: config.model,
      systemPrompt: effectiveSystemPrompt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await log("error", `Failed to generate group summary: ${msg}`);
  }

  await log("info", "AI report pipeline complete");
}
