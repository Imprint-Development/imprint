"use server";

import { db } from "@/lib/db";
import { checkpoints, checkpointAnalyses } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { analyzeCheckpoint } from "@/lib/analysis/analyzer";

export async function createCheckpoint(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const gitRef = (formData.get("gitRef") as string) || null;
  const timestampStr = formData.get("timestamp") as string;
  const timestamp = timestampStr ? new Date(timestampStr) : null;

  const [checkpoint] = await db
    .insert(checkpoints)
    .values({ name, courseId, gitRef, timestamp, status: "pending" })
    .returning();

  redirect(`/courses/${courseId}/checkpoints/${checkpoint.id}`);
}

export async function triggerAnalysis(checkpointId: string, courseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .update(checkpoints)
    .set({ status: "analyzing" })
    .where(eq(checkpoints.id, checkpointId));

  try {
    await analyzeCheckpoint(checkpointId);
    await db
      .update(checkpoints)
      .set({ status: "complete" })
      .where(eq(checkpoints.id, checkpointId));
  } catch (error) {
    console.error("Analysis failed:", error);
    await db
      .update(checkpoints)
      .set({ status: "failed" })
      .where(eq(checkpoints.id, checkpointId));
  }

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
    .update(checkpoints)
    .set({ status: "pending" })
    .where(eq(checkpoints.id, checkpointId));

  revalidatePath(`/courses/${courseId}/checkpoints/${checkpointId}`);
}
