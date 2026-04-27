import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  courses,
  courseCollaborators,
  checkpoints,
  studentGroups,
  students,
  repositories,
  checkpointAnalyses,
  checkpointRepoMeta,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import AppLink from "@/components/AppLink";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // Courses the user has access to
  const userCourses = await db
    .select({ id: courses.id, name: courses.name, semester: courses.semester })
    .from(courseCollaborators)
    .innerJoin(courses, eq(courses.id, courseCollaborators.courseId))
    .where(eq(courseCollaborators.userId, userId));

  const courseIds = userCourses.map((c) => c.id);

  if (courseIds.length === 0) {
    return (
      <>
        <Typography variant="h5" sx={{ mb: 0.5 }}>
          Welcome back, {session.user.name ?? "User"}
        </Typography>
        <Typography variant="body2" sx={{ mb: 4, color: "text.secondary" }}>
          Here&apos;s an overview of your workspace.
        </Typography>
        <Alert severity="info">
          No courses yet.{" "}
          <AppLink href="/courses/new">Create your first course</AppLink> to get
          started.
        </Alert>
      </>
    );
  }

  // Checkpoints for all user courses
  const allCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(inArray(checkpoints.courseId, courseIds));

  const checkpointIds = allCheckpoints.map((c) => c.id);
  const completeCheckpoints = allCheckpoints.filter(
    (c) => c.status === "complete"
  );
  const activeCheckpoints = allCheckpoints.filter(
    (c) => c.status === "analyzing"
  );

  // Groups and students
  const allGroups = await db
    .select()
    .from(studentGroups)
    .where(inArray(studentGroups.courseId, courseIds));

  const groupIds = allGroups.map((g) => g.id);

  const allStudents =
    groupIds.length > 0
      ? await db
          .select()
          .from(students)
          .where(inArray(students.groupId, groupIds))
      : [];

  const allRepos =
    groupIds.length > 0
      ? await db
          .select()
          .from(repositories)
          .where(inArray(repositories.groupId, groupIds))
      : [];

  // ── Warnings ─────────────────────────────────────────────────────────────

  // Groups without any repository
  const repoGroupIds = new Set(allRepos.map((r) => r.groupId));
  const groupsWithoutRepo = allGroups.filter(
    (g) => !repoGroupIds.has(g.id) && g.id
  );

  // Students with no git emails configured
  const studentsWithoutGitEmails = allStudents.filter(
    (s) => s.gitEmails.length === 0
  );

  // Unidentified authors from recent complete checkpoints (last 5)
  const recentCompleteIds = completeCheckpoints
    .sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    )
    .slice(0, 5)
    .map((c) => c.id);

  const unidentifiedAuthorWarnings =
    recentCompleteIds.length > 0
      ? await db
          .select({
            checkpointId: checkpointRepoMeta.checkpointId,
            repoUrl: repositories.url,
            unidentifiedAuthors: checkpointRepoMeta.unidentifiedAuthors,
          })
          .from(checkpointRepoMeta)
          .innerJoin(
            repositories,
            eq(repositories.id, checkpointRepoMeta.repositoryId)
          )
          .where(inArray(checkpointRepoMeta.checkpointId, recentCompleteIds))
      : [];

  const activeUnidentifiedWarnings = unidentifiedAuthorWarnings.filter(
    (w) => (w.unidentifiedAuthors as string[]).length > 0
  );

  // ── Aggregated checkpoint metrics ─────────────────────────────────────────

  // Sum code metrics across all complete checkpoints
  type MetricAgg = {
    commits: number;
    linesAdded: number;
    linesRemoved: number;
    filesChanged: number;
  };

  const zeroAgg = (): MetricAgg => ({
    commits: 0,
    linesAdded: 0,
    linesRemoved: 0,
    filesChanged: 0,
  });

  const codeAgg = zeroAgg();
  const testAgg = zeroAgg();

  if (checkpointIds.length > 0) {
    const analysisData = await db
      .select({
        codeMetrics: checkpointAnalyses.codeMetrics,
        testMetrics: checkpointAnalyses.testMetrics,
      })
      .from(checkpointAnalyses)
      .where(inArray(checkpointAnalyses.checkpointId, checkpointIds));

    for (const row of analysisData) {
      const cm = (row.codeMetrics as Record<string, number>) ?? {};
      const tm = (row.testMetrics as Record<string, number>) ?? {};
      codeAgg.commits += cm.commits ?? 0;
      codeAgg.linesAdded += cm.linesAdded ?? 0;
      codeAgg.linesRemoved += cm.linesRemoved ?? 0;
      codeAgg.filesChanged += cm.filesChanged ?? 0;
      testAgg.linesAdded += tm.linesAdded ?? 0;
      testAgg.linesRemoved += tm.linesRemoved ?? 0;
      testAgg.filesChanged += tm.filesChanged ?? 0;
    }
  }

  // ── Course-level checkpoint summary ───────────────────────────────────────
  const checkpointsByCourse = new Map<
    string,
    { total: number; complete: number; analyzing: number; failed: number }
  >();
  for (const cp of allCheckpoints) {
    const existing = checkpointsByCourse.get(cp.courseId) ?? {
      total: 0,
      complete: 0,
      analyzing: 0,
      failed: 0,
    };
    existing.total++;
    if (cp.status === "complete") existing.complete++;
    if (cp.status === "analyzing") existing.analyzing++;
    if (cp.status === "failed") existing.failed++;
    checkpointsByCourse.set(cp.courseId, existing);
  }

  const hasWarnings =
    groupsWithoutRepo.length > 0 ||
    studentsWithoutGitEmails.length > 0 ||
    activeUnidentifiedWarnings.length > 0;

  const statsData = [
    { label: "Courses", value: userCourses.length },
    { label: "Student Groups", value: allGroups.length },
    { label: "Total Students", value: allStudents.length },
    { label: "Active Analyses", value: activeCheckpoints.length },
    { label: "Complete Checkpoints", value: completeCheckpoints.length },
    { label: "Total Checkpoints", value: allCheckpoints.length },
  ];

  return (
    <>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        Welcome back, {session.user.name ?? "User"}
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: "text.secondary" }}>
        Here&apos;s an overview of your workspace.
      </Typography>

      {/* ── Stat cards ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            sm: "repeat(3, 1fr)",
            md: "repeat(6, 1fr)",
          },
          gap: 2,
          mb: 4,
        }}
      >
        {statsData.map((stat) => (
          <Card key={stat.label} variant="outlined">
            <CardContent sx={{ pb: "12px !important" }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {stat.label}
              </Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>
                {stat.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* ── Aggregated metrics ── */}
      {completeCheckpoints.length > 0 && (
        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Aggregated Analysis Metrics
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", display: "block", mb: 2 }}
            >
              Totals across all complete checkpoints in your courses
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, 1fr)",
                  sm: "repeat(4, 1fr)",
                },
                gap: 2,
              }}
            >
              {[
                { label: "Total Commits", value: codeAgg.commits },
                { label: "Code Lines Added", value: codeAgg.linesAdded },
                { label: "Code Lines Removed", value: codeAgg.linesRemoved },
                { label: "Code Files Changed", value: codeAgg.filesChanged },
                { label: "Test Lines Added", value: testAgg.linesAdded },
                { label: "Test Lines Removed", value: testAgg.linesRemoved },
                { label: "Test Files Changed", value: testAgg.filesChanged },
              ].map((m) => (
                <Box key={m.label}>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary" }}
                  >
                    {m.label}
                  </Typography>
                  <Typography variant="h6">
                    {m.value.toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Warnings ── */}
      {hasWarnings && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Setup Warnings
          </Typography>
          <Stack spacing={1.5}>
            {groupsWithoutRepo.map((g) => {
              const course = userCourses.find((c) => c.id === g.courseId);
              return (
                <Alert key={g.id} severity="warning">
                  <AlertTitle>Group has no repository</AlertTitle>
                  <strong>{g.name}</strong> in{" "}
                  <AppLink href={`/courses/${g.courseId}/groups/${g.id}`}>
                    {course?.name ?? g.courseId}
                  </AppLink>{" "}
                  has no repositories configured. Analysis will be skipped for
                  this group.
                </Alert>
              );
            })}

            {studentsWithoutGitEmails.length > 0 && (
              <Alert severity="warning">
                <AlertTitle>
                  {studentsWithoutGitEmails.length} student
                  {studentsWithoutGitEmails.length !== 1 ? "s" : ""} with no git
                  email
                </AlertTitle>
                The following students have no git email aliases configured —
                their commits will not be attributed:{" "}
                {studentsWithoutGitEmails.map((s) => s.displayName).join(", ")}
              </Alert>
            )}

            {activeUnidentifiedWarnings.map((w, i) => {
              const cp = allCheckpoints.find((c) => c.id === w.checkpointId);
              const course = cp
                ? userCourses.find((c) => c.id === cp.courseId)
                : undefined;
              return (
                <Alert key={i} severity="warning">
                  <AlertTitle>Unidentified authors in analysis</AlertTitle>
                  Checkpoint{" "}
                  {cp ? (
                    <AppLink
                      href={`/courses/${cp.courseId}/checkpoints/${cp.id}`}
                    >
                      {cp.name}
                    </AppLink>
                  ) : (
                    "unknown"
                  )}{" "}
                  {course ? `(${course.name})` : ""} — repo{" "}
                  <strong>{w.repoUrl}</strong> has unidentified authors:{" "}
                  {(w.unidentifiedAuthors as string[]).join(", ")}
                </Alert>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* ── Course checkpoint summary ── */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Courses
          </Typography>
        </CardContent>
        <Divider />
        <TableContainer component={Paper} variant="outlined" sx={{ border: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Course</TableCell>
                <TableCell>Semester</TableCell>
                <TableCell align="right">Groups</TableCell>
                <TableCell align="right">Students</TableCell>
                <TableCell align="right">Checkpoints</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userCourses.map((course) => {
                const cpSummary = checkpointsByCourse.get(course.id) ?? {
                  total: 0,
                  complete: 0,
                  analyzing: 0,
                  failed: 0,
                };
                const courseGroups = allGroups.filter(
                  (g) => g.courseId === course.id
                );
                const courseStudents = allStudents.filter((s) =>
                  courseGroups.some((g) => g.id === s.groupId)
                );

                return (
                  <TableRow key={course.id}>
                    <TableCell>
                      <AppLink href={`/courses/${course.id}`}>
                        {course.name}
                      </AppLink>
                    </TableCell>
                    <TableCell>{course.semester}</TableCell>
                    <TableCell align="right">{courseGroups.length}</TableCell>
                    <TableCell align="right">{courseStudents.length}</TableCell>
                    <TableCell align="right">{cpSummary.total}</TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ flexWrap: "wrap" }}
                      >
                        {cpSummary.complete > 0 && (
                          <Chip
                            label={`${cpSummary.complete} complete`}
                            size="small"
                            color="success"
                          />
                        )}
                        {cpSummary.analyzing > 0 && (
                          <Chip
                            label={`${cpSummary.analyzing} running`}
                            size="small"
                            color="primary"
                          />
                        )}
                        {cpSummary.failed > 0 && (
                          <Chip
                            label={`${cpSummary.failed} failed`}
                            size="small"
                            color="error"
                          />
                        )}
                        {cpSummary.total === 0 && (
                          <Typography
                            variant="caption"
                            sx={{ color: "text.disabled" }}
                          >
                            No checkpoints
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </>
  );
}
