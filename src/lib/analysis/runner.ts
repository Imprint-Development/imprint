import { db } from "@/lib/db";
import {
  checkpoints,
  courses,
  studentGroups,
  checkpointLogs,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { LogLevel } from "./pipelines/types";
import { runContributionsPipeline } from "./pipelines/contributions";
import { runReviewPipeline } from "./pipelines/review";
import { ALL_PIPELINE_IDS } from "./pipelines/registry";

/**
 * Runs all enabled analysis pipelines for a checkpoint in parallel — both
 * across groups and across pipelines within each group.
 *
 * Progress and errors are written to checkpointLogs.
 * Status is always set to "complete" or "failed" in a finally block so the
 * checkpoint never gets stuck in "analyzing".
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
          async (level: LogLevel, message: string): Promise<void> => {
            await db.insert(checkpointLogs).values({
              checkpointId,
              groupId: group.id,
              pipeline,
              level,
              message,
            });
            console.log(`[${pipeline}][${group.name}][${level}] ${message}`);
          };

        const pipelineResults = await Promise.allSettled(
          enabledPipelines.map(async (pipelineId) => {
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
                  log,
                });
                break;
              case "review":
                await runReviewPipeline({
                  checkpoint,
                  group,
                  ignoredEmails,
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
          })
        );

        for (const result of pipelineResults) {
          if (result.status === "rejected") {
            const pipelineLog = makeLogger("runner");
            const msg =
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason);
            await pipelineLog(
              "error",
              `Pipeline failed for group "${group.name}": ${msg}`
            );
            throw new Error(msg);
          }
        }
      })
    );

    for (const result of groupResults) {
      if (result.status === "rejected") {
        failed = true;
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
    // Always write the final status so the checkpoint never stays "analyzing"
    await db
      .update(checkpoints)
      .set({ status: failed ? "failed" : "complete" })
      .where(eq(checkpoints.id, checkpointId));
    console.log(
      `[runner] Checkpoint ${checkpointId} status set to ${failed ? "failed" : "complete"}`
    );
  }
}
