"use server";

import { db } from "@/lib/db";
import { grades, checkpoints, studentGroups } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function saveGrade(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const checkpointId = formData.get("checkpointId") as string;
  const groupId = formData.get("groupId") as string;
  const points = parseFloat(formData.get("points") as string);
  const maxPoints = parseFloat(formData.get("maxPoints") as string);
  const notes = (formData.get("notes") as string) || null;

  await db
    .insert(grades)
    .values({
      checkpointId,
      groupId,
      points,
      maxPoints,
      notes,
      gradedBy: session.user.id,
    })
    .onConflictDoUpdate({
      target: [grades.checkpointId, grades.groupId],
      set: {
        points,
        maxPoints,
        notes,
        gradedBy: session.user.id,
        createdAt: new Date(),
      },
    });

  revalidatePath("/grading");
}

export async function exportGradesCSV(courseId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const courseCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.courseId, courseId));

  const groups = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.courseId, courseId));

  const checkpointIds = new Set(courseCheckpoints.map((c) => c.id));
  const allGrades =
    checkpointIds.size > 0 ? await db.select().from(grades) : [];
  const courseGrades = allGrades.filter((g) =>
    checkpointIds.has(g.checkpointId!)
  );

  const rows: string[] = ["Group,Checkpoint,Points,MaxPoints,Percentage,Notes"];

  for (const group of groups) {
    for (const cp of courseCheckpoints) {
      const grade = courseGrades.find(
        (g) => g.checkpointId === cp.id && g.groupId === group.id
      );
      const points = grade?.points ?? 0;
      const maxPoints = grade?.maxPoints ?? 0;
      const percentage =
        maxPoints > 0 ? ((points / maxPoints) * 100).toFixed(1) : "0.0";
      const notes = (grade?.notes ?? "").replace(/"/g, '""');
      rows.push(
        `"${group.name}","${cp.name}",${points},${maxPoints},${percentage}%,"${notes}"`
      );
    }
  }

  return rows.join("\n");
}
