"use server";

import { db } from "@/lib/db";
import { users, checkpoints } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { analysisQueue } from "@/lib/queue";
import { ALL_PIPELINE_IDS } from "@/lib/analysis/pipelines/registry";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [currentUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (currentUser?.role !== "admin") throw new Error("Forbidden");
  return session.user.id;
}

export type DebugRunResult =
  | { ok: true; jobId: string | undefined }
  | { ok: false; error: string };

/**
 * Admin-only: enqueue a pipeline run with manually chosen inputs.
 * Does NOT clear prior logs or reset checkpoint status — this is
 * an additive debug trigger.
 */
export async function debugRunPipeline(
  formData: FormData
): Promise<DebugRunResult> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const checkpointId = formData.get("checkpointId") as string | null;
  const groupId = (formData.get("groupId") as string | null) || undefined;
  const selected = formData.getAll("pipeline") as string[];
  const pipelines = selected.length > 0 ? selected : ALL_PIPELINE_IDS;

  if (!checkpointId) {
    return { ok: false, error: "checkpointId is required" };
  }

  // Load the checkpoint to get courseId
  const [cp] = await db
    .select({ courseId: checkpoints.courseId })
    .from(checkpoints)
    .where(eq(checkpoints.id, checkpointId))
    .limit(1);

  if (!cp) {
    return { ok: false, error: "Checkpoint not found" };
  }

  // Temporarily override enabledPipelines on the checkpoint so the runner
  // respects the admin's selection, then restore after the job is enqueued.
  const runId = crypto.randomUUID();
  await db
    .update(checkpoints)
    .set({ enabledPipelines: pipelines, currentRunId: runId })
    .where(eq(checkpoints.id, checkpointId));

  const jobName = groupId ? "analyze-group" : "analyze";
  const job = await analysisQueue.add(jobName, {
    checkpointId,
    courseId: cp.courseId,
    groupId,
    runId,
  });

  return { ok: true, jobId: job.id };
}
