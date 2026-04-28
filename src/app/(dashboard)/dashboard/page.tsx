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
import TabNav from "@/components/TabNav";
import DashboardCourseSyncer from "./DashboardCourseSyncer";
import RerunButton from "@/components/RerunButton";
import { triggerAnalysis } from "@/lib/actions/checkpoints";
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

const TABS = [
  { label: "Overview", value: "overview" },
  { label: "Health", value: "health" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { courseId, tab = "overview" } = await searchParams;

  // Verify the user has access to this course
  const userCourses = await db
    .select({ id: courses.id, name: courses.name, semester: courses.semester })
    .from(courseCollaborators)
    .innerJoin(courses, eq(courses.id, courseCollaborators.courseId))
    .where(eq(courseCollaborators.userId, userId));

  const course = courseId
    ? (userCourses.find((c) => c.id === courseId) ?? null)
    : null;

  // ── No course selected ────────────────────────────────────────────────────
  if (!course) {
    return (
      <>
        <DashboardCourseSyncer />
        <Typography variant="h5" sx={{ mb: 0.5 }}>
          Welcome back, {session.user.name ?? "User"}
        </Typography>
        <Typography variant="body2" sx={{ mb: 4, color: "text.secondary" }}>
          Select a course from the sidebar to see your dashboard.
        </Typography>
        {userCourses.length === 0 && (
          <Alert severity="info">
            No courses yet.{" "}
            <AppLink href="/courses/new">Create your first course</AppLink> to
            get started.
          </Alert>
        )}
      </>
    );
  }

  // ── Fetch data for the selected course ───────────────────────────────────

  const allCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.courseId, course.id));

  const checkpointIds = allCheckpoints.map((c) => c.id);
  const completeCheckpoints = allCheckpoints.filter(
    (c) => c.status === "complete"
  );

  const allGroups = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.courseId, course.id));

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

  // ── Aggregate code/test metrics across all complete checkpoints ───────────

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

  // ── Health: warnings ─────────────────────────────────────────────────────

  // Groups without any repository
  const repoGroupIds = new Set(allRepos.map((r) => r.groupId));
  const groupsWithoutRepo = allGroups.filter((g) => !repoGroupIds.has(g.id));

  // Unidentified authors from recent complete checkpoints (last 5)
  const recentCompleteIds = [...completeCheckpoints]
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

  const totalWarnings =
    groupsWithoutRepo.length + activeUnidentifiedWarnings.length;

  // ── Checkpoint summary per group ─────────────────────────────────────────
  const checkpointsByStatus = {
    complete: allCheckpoints.filter((c) => c.status === "complete").length,
    analyzing: allCheckpoints.filter((c) => c.status === "analyzing").length,
    failed: allCheckpoints.filter((c) => c.status === "failed").length,
    pending: allCheckpoints.filter((c) => c.status === "pending").length,
  };

  const statsData = [
    { label: "Groups", value: allGroups.length },
    { label: "Students", value: allStudents.length },
    { label: "Repositories", value: allRepos.length },
    { label: "Checkpoints", value: allCheckpoints.length },
    { label: "Complete", value: checkpointsByStatus.complete },
    { label: "Active Analyses", value: checkpointsByStatus.analyzing },
  ];

  return (
    <>
      <DashboardCourseSyncer />

      <Stack
        direction="row"
        sx={{ alignItems: "baseline", mb: 0.5, gap: 1.5, flexWrap: "wrap" }}
      >
        <Typography variant="h5">{course.name}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {course.semester}
        </Typography>
      </Stack>

      <TabNav
        tabs={
          totalWarnings > 0
            ? [TABS[0], { label: `Health (${totalWarnings})`, value: "health" }]
            : TABS
        }
        defaultTab="overview"
      />

      {/* ── Overview tab ── */}
      {tab === "overview" && (
        <>
          {/* Stat cards */}
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
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary" }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.5 }}>
                    {stat.value}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Aggregated metrics */}
          {completeCheckpoints.length > 0 && (
            <Card variant="outlined" sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 0.5 }}>
                  Aggregated Analysis Metrics
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", display: "block", mb: 2 }}
                >
                  Totals across all {completeCheckpoints.length} complete
                  checkpoint{completeCheckpoints.length !== 1 ? "s" : ""}
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
                    {
                      label: "Code Lines Removed",
                      value: codeAgg.linesRemoved,
                    },
                    {
                      label: "Code Files Changed",
                      value: codeAgg.filesChanged,
                    },
                    { label: "Test Lines Added", value: testAgg.linesAdded },
                    {
                      label: "Test Lines Removed",
                      value: testAgg.linesRemoved,
                    },
                    {
                      label: "Test Files Changed",
                      value: testAgg.filesChanged,
                    },
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

          {/* Checkpoint list */}
          {allCheckpoints.length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Checkpoints
                </Typography>
              </CardContent>
              <Divider />
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ border: 0 }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Git Ref</TableCell>
                      <TableCell>Start Date</TableCell>
                      <TableCell>End Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allCheckpoints
                      .sort(
                        (a, b) =>
                          (b.createdAt?.getTime() ?? 0) -
                          (a.createdAt?.getTime() ?? 0)
                      )
                      .map((cp) => (
                        <TableRow key={cp.id}>
                          <TableCell>
                            <AppLink
                              href={`/courses/${course.id}/checkpoints/${cp.id}`}
                            >
                              {cp.name}
                            </AppLink>
                          </TableCell>
                          <TableCell>
                            <Typography
                              component="span"
                              sx={{
                                fontFamily: "monospace",
                                fontSize: "0.75rem",
                              }}
                            >
                              {cp.gitRef ?? "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {cp.startDate?.toLocaleDateString() ?? "—"}
                          </TableCell>
                          <TableCell>
                            {cp.endDate?.toLocaleDateString() ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={cp.status}
                              size="small"
                              color={
                                cp.status === "complete"
                                  ? "success"
                                  : cp.status === "analyzing"
                                    ? "primary"
                                    : cp.status === "failed"
                                      ? "error"
                                      : "default"
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {cp.status !== "analyzing" && (
                              <RerunButton
                                action={triggerAnalysis.bind(
                                  null,
                                  cp.id,
                                  course.id
                                )}
                                enabledPipelines={cp.enabledPipelines}
                                isPending={cp.status === "pending"}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </>
      )}

      {/* ── Health tab ── */}
      {tab === "health" && (
        <Box>
          {totalWarnings === 0 ? (
            <Alert severity="success">
              No issues found. All groups have repositories configured and
              recent analyses have no unidentified authors.
            </Alert>
          ) : (
            <Stack spacing={1.5}>
              {groupsWithoutRepo.map((g) => (
                <Alert key={g.id} severity="warning">
                  <AlertTitle>Group has no repository</AlertTitle>
                  <AppLink href={`/courses/${course.id}/groups/${g.id}`}>
                    {g.name}
                  </AppLink>{" "}
                  has no repositories configured. Analysis will be skipped for
                  this group.
                </Alert>
              ))}

              {activeUnidentifiedWarnings.map((w, i) => {
                const cp = allCheckpoints.find((c) => c.id === w.checkpointId);
                return (
                  <Alert key={i} severity="warning">
                    <AlertTitle>Unidentified authors in analysis</AlertTitle>
                    {cp ? (
                      <AppLink
                        href={`/courses/${course.id}/checkpoints/${cp.id}`}
                      >
                        {cp.name}
                      </AppLink>
                    ) : (
                      "Unknown checkpoint"
                    )}{" "}
                    — <strong>{w.repoUrl}</strong> has unidentified git authors:{" "}
                    {(w.unidentifiedAuthors as string[]).join(", ")}
                  </Alert>
                );
              })}
            </Stack>
          )}
        </Box>
      )}
    </>
  );
}
