import { db } from "@/lib/db";
import {
  courses,
  courseCollaborators,
  checkpoints,
  studentGroups,
  students,
  grades,
} from "@/lib/db/schema";
import type { GradingConfig, GradeThreshold } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";

function calcGrade(
  points: number,
  maxPoints: number,
  thresholds: GradeThreshold[]
): string {
  if (maxPoints === 0) return "—";
  const pct = (points / maxPoints) * 100;
  const sorted = [...thresholds].sort(
    (a, b) => b.minPercentage - a.minPercentage
  );
  for (const t of sorted) {
    if (pct >= t.minPercentage) return t.grade;
  }
  return "—";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [membership] = await db
    .select()
    .from(courseCollaborators)
    .where(
      and(
        eq(courseCollaborators.courseId, courseId),
        eq(courseCollaborators.userId, session.user.id)
      )
    );
  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId));
  if (!course) {
    return new Response("Not found", { status: 404 });
  }

  const config: GradingConfig = course.gradingConfig;
  const standaloneCategories = config.categories.filter(
    (c) => !c.perCheckpoint
  );
  const perCpCategories = config.categories.filter((c) => c.perCheckpoint);

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

  const overrides = config.checkpointOverrides ?? {};
  const effMax = (catId: string, cpId: string, def: number) =>
    overrides[cpId]?.[catId]?.maxPoints ?? def;

  const maxPossible =
    standaloneCategories.reduce((s, c) => s + c.maxPoints, 0) +
    courseCheckpoints.reduce(
      (cpSum, cp) =>
        cpSum +
        perCpCategories.reduce(
          (catSum, cat) => catSum + effMax(cat.id, cp.id, cat.maxPoints),
          0
        ),
      0
    );

  // Build CSV header
  const headers = ["Student", "Group"];
  for (const cat of standaloneCategories) {
    headers.push(`${cat.name} (/${cat.maxPoints})`);
  }
  for (const cp of courseCheckpoints) {
    for (const cat of perCpCategories) {
      const max = effMax(cat.id, cp.id, cat.maxPoints);
      headers.push(`${cp.name} - ${cat.name} (/${max})`);
    }
  }
  headers.push("Total Points", "Max Points", "Percentage", "Grade");

  const rows: string[] = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
  ];

  for (const student of allStudents) {
    const studentGrades = allGrades.filter((g) => g.studentId === student.id);
    const displayName = String(student.displayName).replace(/"/g, '""');
    const groupName = String(groupMap.get(student.groupId) ?? "").replace(
      /"/g,
      '""'
    );
    const row: string[] = [`"${displayName}"`, `"${groupName}"`];

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
      for (const cat of perCpCategories) {
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
    const grade = calcGrade(totalPoints, maxPossible, config.gradeThresholds);

    row.push(
      String(totalPoints),
      String(maxPossible),
      `${percentage}%`,
      `"${grade}"`
    );
    rows.push(row.join(","));
  }

  const csv = rows.join("\n");
  const safeName = course.name.replace(/[^a-zA-Z0-9_-]/g, "_");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="grades-${safeName}.csv"`,
    },
  });
}
