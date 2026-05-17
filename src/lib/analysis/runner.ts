import { db } from "@/lib/db";
import {
  checkpoints,
  courses,
  studentGroups,
  checkpointLogs,
} from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import type { LogLevel } from "./pipelines/types";
import { runContributionsPipeline } from "./pipelines/contributions";
import { runReviewPipeline } from "./pipelines/review";
import { runAiReportPipeline } from "./pipelines/ai-report";
import { ALL_PIPELINE_IDS } from "./pipelines/registry";

/**
 * Runs all enabled analysis pipelines for a checkpoint in parallel — both
 * across groups and across pipelines within each group.
 *
 * A failed pipeline is logged and recorded but does NOT abort other pipelines
 * or groups — partial results are preserved. The checkpoint is marked
 * "complete" as long as the run finishes (even with pipeline-level errors).
 * It is only marked "failed" when an unexpected error prevents the run from
 * completing at all (e.g. the checkpoint record cannot be loaded).
 */
export async function runAnalysis(
  checkpointId: string,
  groupIdFilter?: string
): Promise<void> {
  let failed = false;

  try {
    const [checkpoint] = await db
      .select()
      .from(checkpoints)
      .where(eq(checkpoints.id, checkpointId));

    if (!checkpoint) throw new Error(`Checkpoint ${checkpointId} not found`);

    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, checkpoint.courseId));

    const ignoredEmails = new Set(
      (course?.ignoredGitEmails ?? []).map((e) => e.toLowerCase())
    );

    const ignoredGithubUsernames = new Set(
      (course?.ignoredGithubUsernames ?? []).map((u) => u.toLowerCase())
    );

    const allGroups = await db
      .select()
      .from(studentGroups)
      .where(
        groupIdFilter
          ? and(
              eq(studentGroups.courseId, checkpoint.courseId),
              eq(studentGroups.id, groupIdFilter)
            )
          : eq(studentGroups.courseId, checkpoint.courseId)
      );

    const enabledPipelines: string[] =
      checkpoint.enabledPipelines.length > 0
        ? checkpoint.enabledPipelines
        : ALL_PIPELINE_IDS;

    // Run all groups in parallel; within each group run all pipelines in parallel.
    const groupResults = await Promise.allSettled(
      allGroups.map(async (group) => {
        const makeLogger =
          (pipeline: string) =>
          async (
            level: LogLevel,
            message: string,
            repositoryId?: string
          ): Promise<void> => {
            await db.insert(checkpointLogs).values({
              checkpointId,
              groupId: group.id,
              repositoryId: repositoryId ?? null,
              pipeline,
              level,
              message,
            });
            console.log(`[${pipeline}][${group.name}][${level}] ${message}`);
          };

        // Split into two passes: non-AI pipelines run first in parallel,
        // then ai-report runs after so checkpointAnalyses rows already exist.
        const nonAiPipelines = enabledPipelines.filter(
          (p) => p !== "ai-report"
        );
        const hasAiReport = enabledPipelines.includes("ai-report");

        const runPipeline = async (pipelineId: string): Promise<void> => {
          const log = makeLogger(pipelineId);
          await log(
            "info",
            `Starting ${pipelineId} pipeline for group "${group.name}"`
          );

          switch (pipelineId) {
            case "contributions":
              await runContributionsPipeline({
                checkpoint,
                group,
                ignoredEmails,
                ignoredGithubUsernames,
                log,
              });
              break;
            case "review":
              await runReviewPipeline({
                checkpoint,
                group,
                ignoredEmails,
                ignoredGithubUsernames,
                log,
              });
              break;
            case "ai-report":
              await runAiReportPipeline({
                checkpoint,
                group,
                ignoredEmails,
                ignoredGithubUsernames,
                log,
              });
              break;
            default:
              await log("warn", `Unknown pipeline "${pipelineId}" — skipped`);
              return;
          }

          await log(
            "info",
            `${pipelineId} pipeline complete for group "${group.name}"`
          );
        };

        // Pass 1: run contributions, review, etc. in parallel
        const pipelineResults = await Promise.allSettled(
          nonAiPipelines.map(runPipeline)
        );

        // Log pass-1 failures but do NOT re-throw
        for (const [i, result] of pipelineResults.entries()) {
          if (result.status === "rejected") {
            const pipelineId = nonAiPipelines[i] ?? "unknown";
            const runnerLog = makeLogger("runner");
            const msg =
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason);
            await runnerLog(
              "error",
              `Pipeline "${pipelineId}" failed for group "${group.name}": ${msg}`
            );
            console.error(
              `[runner][${pipelineId}][${group.name}] pipeline failed:`,
              result.reason
            );
          }
        }

        // Pass 2: ai-report runs after pass 1 so analyses are committed
        if (hasAiReport) {
          try {
            await runPipeline("ai-report");
          } catch (err) {
            const runnerLog = makeLogger("runner");
            const msg = err instanceof Error ? err.message : String(err);
            await runnerLog(
              "error",
              `Pipeline "ai-report" failed for group "${group.name}": ${msg}`
            );
            console.error(
              `[runner][ai-report][${group.name}] pipeline failed:`,
              err
            );
          }
        }
      })
    );

    // Group-level rejections would only happen from unexpected errors (e.g.
    // DB failures in makeLogger). Pipeline errors are handled above and do
    // not propagate here.
    for (const result of groupResults) {
      if (result.status === "rejected") {
        failed = true;
        console.error(
          `[runner] Unexpected group-level error for checkpoint ${checkpointId}:`,
          result.reason
        );
      }
    }
  } catch (err) {
    // Unexpected error outside the per-group logic (e.g. DB lookup failure)
    failed = true;
    console.error(
      `[runner] Unexpected error for checkpoint ${checkpointId}:`,
      err
    );
  } finally {
    // Only update status if the checkpoint is still "analyzing".
    // If the run was aborted (status reset to "pending"), leave it alone.
    const targetStatus = failed ? "failed" : "complete";
    const result = await db
      .update(checkpoints)
      .set({ status: targetStatus })
      .where(
        and(eq(checkpoints.id, checkpointId), ne(checkpoints.status, "pending"))
      )
      .returning({ status: checkpoints.status });

    if (result.length > 0) {
      console.log(
        `[runner] Checkpoint ${checkpointId} status set to ${targetStatus}`
      );
    } else {
      console.log(
        `[runner] Checkpoint ${checkpointId} was aborted; status left as pending`
      );
    }
  }
}
