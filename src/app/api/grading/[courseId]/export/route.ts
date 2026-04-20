import { db } from "@/lib/db";
import {
  courses,
  courseCollaborators,
  checkpoints,
  studentGroups,
  grades,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Verify collaborator access
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

  const courseCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.courseId, courseId));

  const groups = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.courseId, courseId));

  const checkpointIds = courseCheckpoints.map((c) => c.id);
  const allGrades =
    checkpointIds.length > 0 ? await db.select().from(grades) : [];
  const courseGrades = allGrades.filter((g) =>
    checkpointIds.includes(g.checkpointId!)
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

  const csv = rows.join("\n");
  const safeName = course.name.replace(/[^a-zA-Z0-9_-]/g, "_");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="grades-${safeName}.csv"`,
    },
  });
}
