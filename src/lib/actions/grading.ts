"use server";

import { db } from "@/lib/db";
import { grades, checkpoints, studentGroups, students, courses } from "@/lib/db/schema";
import type { GradingConfig } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function saveGrade(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const studentId = formData.get("studentId") as string;
  const categoryId = formData.get("categoryId") as string;
  const checkpointId = (formData.get("checkpointId") as string) || null;
  const points = parseFloat(formData.get("points") as string);
  const notes = (formData.get("notes") as string) || null;
  const gradedBy = session.user.id;

  if (checkpointId) {
    await db.execute(
      sql`INSERT INTO grades (student_id, category_id, checkpoint_id, points, notes, graded_by, created_at)
          VALUES (${studentId}::uuid, ${categoryId}, ${checkpointId}::uuid, ${points}, ${notes}, ${gradedBy}::uuid, NOW())
          ON CONFLICT (student_id, category_id, checkpoint_id) WHERE checkpoint_id IS NOT NULL
          DO UPDATE SET points = EXCLUDED.points, notes = EXCLUDED.notes, graded_by = EXCLUDED.graded_by, created_at = NOW()`
    );
  } else {
    await db.execute(
      sql`INSERT INTO grades (student_id, category_id, checkpoint_id, points, notes, graded_by, created_at)
          VALUES (${studentId}::uuid, ${categoryId}, NULL, ${points}, ${notes}, ${gradedBy}::uuid, NOW())
          ON CONFLICT (student_id, category_id) WHERE checkpoint_id IS NULL
          DO UPDATE SET points = EXCLUDED.points, notes = EXCLUDED.notes, graded_by = EXCLUDED.graded_by, created_at = NOW()`
    );
  }

  revalidatePath("/grading");
}

export async function exportGradesCSV(courseId: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId));
  if (!course) throw new Error("Course not found");

  const config: GradingConfig = course.gradingConfig;
  const { categories } = config;

  const courseCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.courseId, courseId));

  const groups = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.courseId, courseId));

  const groupIds = groups.map((g) => g.id);
  const allStudents =
    groupIds.length > 0
      ? await db
          .select()
          .from(students)
          .where(inArray(students.groupId, groupIds))
      : [];

  const studentIds = allStudents.map((s) => s.id);
  const allGrades =
    studentIds.length > 0
      ? await db
          .select()
          .from(grades)
          .where(inArray(grades.studentId, studentIds))
      : [];

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  const standaloneCategories = categories.filter((c) => !c.perCheckpoint);
  const perCheckpointCategories = categories.filter((c) => c.perCheckpoint);

  // Build header
  const headers = ["Student", "Group"];
  for (const cat of standaloneCategories) {
    headers.push(`${cat.name} (/${cat.maxPoints})`);
  }
  for (const cp of courseCheckpoints) {
    for (const cat of perCheckpointCategories) {
      headers.push(`${cp.name} - ${cat.name} (/${cat.maxPoints})`);
    }
  }
  headers.push("Total Points", "Max Points", "Percentage", "Grade");

  const rows: string[] = [headers.map((h) => `"${h}"`).join(",")];

  const maxPossible =
    standaloneCategories.reduce((s, c) => s + c.maxPoints, 0) +
    perCheckpointCategories.reduce((s, c) => s + c.maxPoints, 0) *
      courseCheckpoints.length;

  const thresholds = [...config.gradeThresholds].sort(
    (a, b) => b.minPercentage - a.minPercentage
  );

  for (const student of allStudents) {
    const studentGrades = allGrades.filter((g) => g.studentId === student.id);
    const row: string[] = [
      `"${student.displayName}"`,
      `"${groupMap.get(student.groupId) ?? ""}"`,
    ];

    let totalPoints = 0;

    for (const cat of standaloneCategories) {
      const g = studentGrades.find(
        (g) => g.categoryId === cat.id && g.checkpointId === null
      );
      const pts = g?.points ?? 0;
      totalPoints += pts;
      row.push(String(pts));
    }

    for (const cp of courseCheckpoints) {
      for (const cat of perCheckpointCategories) {
        const g = studentGrades.find(
          (g) => g.categoryId === cat.id && g.checkpointId === cp.id
        );
        const pts = g?.points ?? 0;
        totalPoints += pts;
        row.push(String(pts));
      }
    }

    const percentage =
      maxPossible > 0 ? ((totalPoints / maxPossible) * 100).toFixed(1) : "0.0";

    let grade = "—";
    if (maxPossible > 0) {
      const pct = (totalPoints / maxPossible) * 100;
      for (const t of thresholds) {
        if (pct >= t.minPercentage) {
          grade = t.grade;
          break;
        }
      }
    }

    row.push(String(totalPoints), String(maxPossible), `${percentage}%`, `"${grade}"`);
    rows.push(row.join(","));
  }

  return rows.join("\n");
}
