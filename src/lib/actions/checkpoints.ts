"use server";

import { db } from "@/lib/db";
import {
  checkpoints,
  checkpointAnalyses,
  checkpointRepoMeta,
  checkpointLogs,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { analysisQueue } from "@/lib/queue";
import { ALL_PIPELINE_IDS } from "@/lib/analysis/pipelines/registry";

export async function createCheckpoint(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const gitRef = (formData.get("gitRef") as string) || null;
  const startDateStr = formData.get("startDate") as string;
  const endDateStr = formData.get("endDate") as string;
  const startDate = startDateStr ? new Date(startDateStr) : null;
  const endDate = endDateStr ? new Date(endDateStr) : null;

  const [checkpoint] = await db
    .insert(checkpoints)
    .values({ name, courseId, gitRef, startDate, endDate, status: "pending" })
    .returning();

  redirect(`/courses/${courseId}/checkpoints/${checkpoint.id}`);
}

export async function triggerAnalysis(
  checkpointId: string,
  courseId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const selected = formData.getAll("pipeline") as string[];
  const enabledPipelines = selected.length > 0 ? selected : ALL_PIPELINE_IDS;

  // Clear any previous logs for this checkpoint
  await db
    .delete(checkpointLogs)
    .where(eq(checkpointLogs.checkpointId, checkpointId));

  await db
    .update(checkpoints)
    .set({ status: "analyzing", enabledPipelines })
    .where(eq(checkpoints.id, checkpointId));

  // Enqueue the analysis job — the worker will update status when done
  await analysisQueue.add("analyze", { checkpointId, courseId });

  revalidatePath(`/courses/${courseId}/checkpoints/${checkpointId}`);
}

export async function deleteCheckpoint(checkpointId: string, courseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.delete(checkpoints).where(eq(checkpoints.id, checkpointId));

  redirect(`/courses/${courseId}`);
}

export async function discardAnalysis(checkpointId: string, courseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .delete(checkpointAnalyses)
    .where(eq(checkpointAnalyses.checkpointId, checkpointId));

  await db
    .delete(checkpointRepoMeta)
    .where(eq(checkpointRepoMeta.checkpointId, checkpointId));

  await db
    .update(checkpoints)
    .set({ status: "pending" })
    .where(eq(checkpoints.id, checkpointId));

  revalidatePath(`/courses/${courseId}/checkpoints/${checkpointId}`);
}

export async function rerunGroupAnalysis(
  checkpointId: string,
  groupId: string,
  courseId: string
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Clear previous logs for this group so the modal only shows latest-run warnings
  await db
    .delete(checkpointLogs)
    .where(
      and(
        eq(checkpointLogs.checkpointId, checkpointId),
        eq(checkpointLogs.groupId, groupId)
      )
    );

  // Mark checkpoint as analyzing so the UI reflects in-progress state
  await db
    .update(checkpoints)
    .set({ status: "analyzing" })
    .where(eq(checkpoints.id, checkpointId));

  // Enqueue a targeted job — the worker will restore status to complete/failed
  await analysisQueue.add("analyze-group", { checkpointId, courseId, groupId });

  revalidatePath(
    `/courses/${courseId}/groups/${groupId}/checkpoints/${checkpointId}`
  );
  revalidatePath(`/courses/${courseId}/checkpoints/${checkpointId}`);
}
