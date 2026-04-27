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
import { ALL_PIPELINE_IDS } from "./pipelines/registry";

/**
 * Runs all analysis pipelines for a checkpoint (or a single group within it).
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

    for (const group of allGroups) {
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

      const enabledPipelines: string[] =
        checkpoint.enabledPipelines.length > 0
          ? checkpoint.enabledPipelines
          : ALL_PIPELINE_IDS;

      // contributions pipeline
      if (enabledPipelines.includes("contributions")) {
        const log = makeLogger("contributions");
        await log(
          "info",
          `Starting contributions pipeline for group "${group.name}"`
        );
        try {
          await runContributionsPipeline({
            checkpoint,
            group,
            ignoredEmails,
            log,
          });
          await log(
            "info",
            `Contributions pipeline complete for group "${group.name}"`
          );
        } catch (err) {
          failed = true;
          const msg = err instanceof Error ? err.message : String(err);
          await log("error", `Contributions pipeline failed: ${msg}`);
        }
      }

      // Future pipelines can be added here, e.g.:
      // if (enabledPipelines.includes("cicd")) {
      //   await runCicdPipeline({ checkpoint, group, ignoredEmails, log: makeLogger("cicd") });
      // }
    }
  } catch (err) {
    // Unexpected error outside the per-group try/catch (e.g. DB lookup failure)
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
