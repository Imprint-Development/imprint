import { db } from "@/lib/db";
import {
  courses,
  courseCollaborators,
  checkpoints,
  studentGroups,
  students,
  grades,
} from "@/lib/db/schema";
import type { GradingConfig } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, inArray, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Typography from "@mui/material/Typography";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import AppLink from "@/components/AppLink";
import FileDownload from "@mui/icons-material/FileDownload";
import GradingClient from "./GradingClient";

export default async function CourseGradingPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { courseId } = await params;

  const [membership] = await db
    .select()
    .from(courseCollaborators)
    .where(
      and(
        eq(courseCollaborators.courseId, courseId),
        eq(courseCollaborators.userId, session.user.id)
      )
    );
  if (!membership) redirect("/courses");

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId));
  if (!course) redirect("/courses");

  const config: GradingConfig = {
    ...course.gradingConfig,
    ungradedCheckpoints: course.gradingConfig.ungradedCheckpoints ?? [],
  };

  const courseCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.courseId, courseId))
    .orderBy(checkpoints.createdAt);

  const groups = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.courseId, courseId))
    .orderBy(asc(studentGroups.name));

  const groupIds = groups.map((g) => g.id);
  const allStudents =
    groupIds.length > 0
      ? await db
          .select()
          .from(students)
          .where(inArray(students.groupId, groupIds))
          .orderBy(asc(students.displayName))
      : [];

  const studentIds = allStudents.map((s) => s.id);
  const allGrades =
    studentIds.length > 0
      ? await db
          .select()
          .from(grades)
          .where(inArray(grades.studentId, studentIds))
      : [];

  const hasCategories = config.categories.length > 0;
  const hasStudents = allStudents.length > 0;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageBreadcrumbs items={[{ label: "Grading" }]} />

      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 3 }}
      >
        <Typography variant="h5">{course.name} — Grading</Typography>
        <Button
          component="a"
          href={`/api/grading/${courseId}/export`}
          startIcon={<FileDownload />}
          variant="outlined"
        >
          Export CSV
        </Button>
      </Stack>

      {!hasCategories ? (
        <Alert severity="info">
          No grading schema configured.{" "}
          <AppLink href={`/courses/${courseId}?tab=grading`}>
            Configure categories
          </AppLink>{" "}
          in course settings before grading.
        </Alert>
      ) : !hasStudents ? (
        <Alert severity="info">
          Add groups and students to this course before grading.
        </Alert>
      ) : (
        <GradingClient
          courseId={courseId}
          config={config}
          groups={groups.map((g) => ({ id: g.id, name: g.name }))}
          students={allStudents.map((s) => ({
            id: s.id,
            displayName: s.displayName,
            email: s.email,
            groupId: s.groupId,
          }))}
          checkpoints={courseCheckpoints.map((cp) => ({
            id: cp.id,
            name: cp.name,
          }))}
          initialGrades={allGrades.map((g) => ({
            studentId: g.studentId!,
            categoryId: g.categoryId,
            checkpointId: g.checkpointId ?? null,
            points: g.points,
          }))}
        />
      )}
    </Box>
  );
}
