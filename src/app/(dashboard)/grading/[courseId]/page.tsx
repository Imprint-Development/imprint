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
import { redirect } from "next/navigation";
import { saveGrade } from "@/lib/actions/grading";
import Typography from "@mui/material/Typography";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import AppLink from "@/components/AppLink";
import Save from "@mui/icons-material/Save";
import FileDownload from "@mui/icons-material/FileDownload";

function calcGrade(
  points: number,
  maxPoints: number,
  thresholds: GradeThreshold[]
): string {
  if (maxPoints === 0) return "—";
  const pct = (points / maxPoints) * 100;
  const sorted = [...thresholds].sort((a, b) => b.minPercentage - a.minPercentage);
  for (const t of sorted) {
    if (pct >= t.minPercentage) return t.grade;
  }
  return "—";
}

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
  if (!membership) redirect("/grading");

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId));
  if (!course) redirect("/grading");

  const config: GradingConfig = course.gradingConfig;
  const standaloneCategories = config.categories.filter((c) => !c.perCheckpoint);
  const perCpCategories = config.categories.filter((c) => c.perCheckpoint);

  const courseCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.courseId, courseId))
    .orderBy(checkpoints.createdAt);

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

  // gradeMap key: "studentId:categoryId:checkpointId" (checkpointId = "" for standalone)
  const gradeMap = new Map<string, (typeof allGrades)[number]>();
  for (const g of allGrades) {
    gradeMap.set(`${g.studentId}:${g.categoryId}:${g.checkpointId ?? ""}`, g);
  }

  const groupMap = new Map(groups.map((g) => [g.id, g.name]));

  const maxPerStudent =
    standaloneCategories.reduce((s, c) => s + c.maxPoints, 0) +
    perCpCategories.reduce((s, c) => s + c.maxPoints, 0) *
      courseCheckpoints.length;

  const hasCategories = config.categories.length > 0;
  const hasStudents = allStudents.length > 0;

  // Number of columns for per-checkpoint categories section
  const perCpColSpan = perCpCategories.length;

  return (
    <Box sx={{ p: 3 }}>
      <PageBreadcrumbs items={[{ label: "Grading" }]} />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
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
      </Box>

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
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ overflow: "auto" }}
        >
          <Table size="small" sx={{ minWidth: 600 }}>
            <TableHead>
              {/* Row 1: category group headers */}
              <TableRow>
                <TableCell rowSpan={2} sx={{ fontWeight: 700 }}>
                  Student
                </TableCell>
                <TableCell rowSpan={2} sx={{ fontWeight: 700 }}>
                  Group
                </TableCell>
                {standaloneCategories.map((cat) => (
                  <TableCell
                    key={cat.id}
                    rowSpan={2}
                    sx={{ fontWeight: 700 }}
                  >
                    {cat.name}
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ display: "block", color: "text.secondary" }}
                    >
                      /{cat.maxPoints} pts
                    </Typography>
                  </TableCell>
                ))}
                {perCpColSpan > 0 &&
                  courseCheckpoints.map((cp) => (
                    <TableCell
                      key={cp.id}
                      colSpan={perCpColSpan}
                      sx={{ fontWeight: 700, borderLeft: "1px solid", borderColor: "divider" }}
                    >
                      {cp.name}
                    </TableCell>
                  ))}
                <TableCell rowSpan={2} sx={{ fontWeight: 700 }}>
                  Total
                </TableCell>
                {config.gradeThresholds.length > 0 && (
                  <TableCell rowSpan={2} sx={{ fontWeight: 700 }}>
                    Grade
                  </TableCell>
                )}
              </TableRow>
              {/* Row 2: per-checkpoint category names */}
              {perCpColSpan > 0 && (
                <TableRow>
                  {courseCheckpoints.map((cp) =>
                    perCpCategories.map((cat) => (
                      <TableCell
                        key={`${cp.id}:${cat.id}`}
                        sx={{
                          borderLeft: cat === perCpCategories[0] ? "1px solid" : undefined,
                          borderColor: "divider",
                        }}
                      >
                        {cat.name}
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ display: "block", color: "text.secondary" }}
                        >
                          /{cat.maxPoints}
                        </Typography>
                      </TableCell>
                    ))
                  )}
                </TableRow>
              )}
            </TableHead>
            <TableBody>
              {allStudents.map((student) => {
                let totalPoints = 0;

                const standaloneCells = standaloneCategories.map((cat) => {
                  const existing = gradeMap.get(
                    `${student.id}:${cat.id}:`
                  );
                  if (existing) totalPoints += existing.points;
                  return (
                    <TableCell key={cat.id}>
                      <form action={saveGrade}>
                        <input type="hidden" name="studentId" value={student.id} />
                        <input type="hidden" name="categoryId" value={cat.id} />
                        <input type="hidden" name="checkpointId" value="" />
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <TextField
                            size="small"
                            type="number"
                            name="points"
                            slotProps={{
                              htmlInput: { step: 0.5, min: 0, max: cat.maxPoints },
                            }}
                            defaultValue={existing?.points ?? ""}
                            placeholder={`/${cat.maxPoints}`}
                            required
                            sx={{ width: 72 }}
                          />
                          <IconButton type="submit" size="small">
                            <Save fontSize="small" />
                          </IconButton>
                        </Box>
                      </form>
                    </TableCell>
                  );
                });

                const perCpCells = courseCheckpoints.flatMap((cp) =>
                  perCpCategories.map((cat, catIdx) => {
                    const existing = gradeMap.get(
                      `${student.id}:${cat.id}:${cp.id}`
                    );
                    if (existing) totalPoints += existing.points;
                    return (
                      <TableCell
                        key={`${cp.id}:${cat.id}`}
                        sx={{
                          borderLeft: catIdx === 0 ? "1px solid" : undefined,
                          borderColor: "divider",
                        }}
                      >
                        <form action={saveGrade}>
                          <input type="hidden" name="studentId" value={student.id} />
                          <input type="hidden" name="categoryId" value={cat.id} />
                          <input type="hidden" name="checkpointId" value={cp.id} />
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <TextField
                              size="small"
                              type="number"
                              name="points"
                              slotProps={{
                                htmlInput: { step: 0.5, min: 0, max: cat.maxPoints },
                              }}
                              defaultValue={existing?.points ?? ""}
                              placeholder={`/${cat.maxPoints}`}
                              required
                              sx={{ width: 72 }}
                            />
                            <IconButton type="submit" size="small">
                              <Save fontSize="small" />
                            </IconButton>
                          </Box>
                        </form>
                      </TableCell>
                    );
                  })
                );

                const pct =
                  maxPerStudent > 0
                    ? ((totalPoints / maxPerStudent) * 100).toFixed(1)
                    : null;

                return (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {student.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {student.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {groupMap.get(student.groupId) ?? "—"}
                      </Typography>
                    </TableCell>
                    {standaloneCells}
                    {perCpCells}
                    <TableCell>
                      {pct !== null ? (
                        <Typography variant="body2">
                          {totalPoints}/{maxPerStudent}{" "}
                          <Typography component="span" variant="caption">
                            ({pct}%)
                          </Typography>
                        </Typography>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    {config.gradeThresholds.length > 0 && (
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {calcGrade(totalPoints, maxPerStudent, config.gradeThresholds)}
                        </Typography>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
