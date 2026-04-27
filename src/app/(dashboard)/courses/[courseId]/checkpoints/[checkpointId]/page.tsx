import AppLink from "@/components/AppLink";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import TabNav from "@/components/TabNav";
import AnalysisLogsWithRefresh from "@/components/AnalysisLogsWithRefresh";
import CheckpointGroupsPane, {
  type GroupPaneData,
} from "./CheckpointGroupsPane";
import { db } from "@/lib/db";
import {
  checkpoints,
  courses,
  studentGroups,
  students,
  repositories,
  checkpointAnalyses,
  checkpointRepoMeta,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  triggerAnalysis,
  deleteCheckpoint,
  discardAnalysis,
} from "@/lib/actions/checkpoints";
import { CHECKPOINT_STATUS_COLOR } from "@/lib/constants";
import type {
  AnalysisRow,
  RepoWarning,
} from "../../groups/[groupId]/checkpoints/[checkpointId]/GroupAnalysisClient";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import HomeRounded from "@mui/icons-material/HomeRounded";

const TABS = [
  { label: "Overview", value: "overview" },
  { label: "Logs", value: "logs" },
  { label: "Settings", value: "settings" },
];

export default async function CheckpointDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; checkpointId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { courseId, checkpointId } = await params;
  const { tab = "overview" } = await searchParams;

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) redirect("/courses");

  const [checkpoint] = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.id, checkpointId));

  if (!checkpoint) redirect(`/courses/${courseId}?tab=checkpoints`);

  const groups = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.courseId, courseId));

  // Build per-group analysis pane data when the checkpoint is complete
  let groupPaneData: GroupPaneData[] = [];

  if (checkpoint.status === "complete") {
    groupPaneData = await Promise.all(
      groups.map(async (group) => {
        const studentList = await db
          .select()
          .from(students)
          .where(eq(students.groupId, group.id));

        const groupRepos = await db
          .select()
          .from(repositories)
          .where(eq(repositories.groupId, group.id));

        const repoIds = groupRepos.map((r) => r.id);

        let analysisRows: AnalysisRow[] = [];
        let repoWarnings: RepoWarning[] = [];

        if (repoIds.length > 0) {
          const analyses = await db
            .select({
              codeMetrics: checkpointAnalyses.codeMetrics,
              testMetrics: checkpointAnalyses.testMetrics,
              studentName: students.displayName,
              repoId: repositories.id,
              repoUrl: repositories.url,
            })
            .from(checkpointAnalyses)
            .innerJoin(students, eq(students.id, checkpointAnalyses.studentId))
            .innerJoin(
              repositories,
              eq(repositories.id, checkpointAnalyses.repositoryId)
            )
            .where(
              and(
                eq(checkpointAnalyses.checkpointId, checkpointId),
                inArray(checkpointAnalyses.repositoryId, repoIds)
              )
            );

          analysisRows = analyses.map((a) => ({
            studentName: a.studentName,
            repoId: a.repoId,
            repoUrl: a.repoUrl,
            codeMetrics: (a.codeMetrics as Record<string, number>) ?? {},
            testMetrics: (a.testMetrics as Record<string, number>) ?? {},
          }));

          const metaRows = await db
            .select({
              repoId: repositories.id,
              repoUrl: repositories.url,
              unidentifiedAuthors: checkpointRepoMeta.unidentifiedAuthors,
            })
            .from(checkpointRepoMeta)
            .innerJoin(
              repositories,
              eq(repositories.id, checkpointRepoMeta.repositoryId)
            )
            .where(
              and(
                eq(checkpointRepoMeta.checkpointId, checkpointId),
                inArray(checkpointRepoMeta.repositoryId, repoIds)
              )
            );

          repoWarnings = metaRows
            .filter((m) => (m.unidentifiedAuthors as string[]).length > 0)
            .map((m) => ({
              repoId: m.repoId,
              repoUrl: m.repoUrl,
              unidentifiedAuthors: m.unidentifiedAuthors as string[],
            }));
        }

        return {
          groupId: group.id,
          groupName: group.name,
          studentCount: studentList.length,
          analysisRows,
          repoWarnings,
        };
      })
    );
  } else {
    // For non-complete status we only need student counts
    groupPaneData = await Promise.all(
      groups.map(async (group) => {
        const studentList = await db
          .select()
          .from(students)
          .where(eq(students.groupId, group.id));
        return {
          groupId: group.id,
          groupName: group.name,
          studentCount: studentList.length,
          analysisRows: [],
          repoWarnings: [],
        };
      })
    );
  }

  const triggerAnalysisWithIds = triggerAnalysis.bind(
    null,
    checkpointId,
    courseId
  );
  const deleteCheckpointWithIds = deleteCheckpoint.bind(
    null,
    checkpointId,
    courseId
  );
  const discardAnalysisWithIds = discardAnalysis.bind(
    null,
    checkpointId,
    courseId
  );

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">
          <HomeRounded fontSize="small" />
        </AppLink>
        <AppLink href="/courses">Courses</AppLink>
        <AppLink href={`/courses/${courseId}`}>{course.name}</AppLink>
        <AppLink href={`/courses/${courseId}?tab=checkpoints`}>
          Checkpoints
        </AppLink>
        <Typography>{checkpoint.name}</Typography>
      </Breadcrumbs>

      <Stack direction="row" sx={{ alignItems: "center", mb: 3 }} spacing={2}>
        <Typography variant="h5">{checkpoint.name}</Typography>
        <Chip
          color={
            CHECKPOINT_STATUS_COLOR[
              checkpoint.status as keyof typeof CHECKPOINT_STATUS_COLOR
            ] ?? "default"
          }
          label={checkpoint.status}
        />
      </Stack>

      <TabNav tabs={TABS} defaultTab="overview" />

      {/* Overview tab */}
      {tab === "overview" && (
        <Box>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>Git Ref:</strong>{" "}
                  <Typography component="span" sx={{ fontFamily: "monospace" }}>
                    {checkpoint.gitRef || "—"}
                  </Typography>
                </Typography>
                <Typography variant="body2">
                  <strong>Start Date:</strong>{" "}
                  {checkpoint.startDate?.toLocaleString() ?? "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>End Date:</strong>{" "}
                  {checkpoint.endDate?.toLocaleString() ?? "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Created:</strong>{" "}
                  {checkpoint.createdAt?.toLocaleString() ?? "—"}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          {checkpoint.status === "pending" && (
            <form action={triggerAnalysisWithIds}>
              <Button type="submit" variant="contained" sx={{ mb: 3 }}>
                Run Analysis
              </Button>
            </form>
          )}

          {checkpoint.status === "analyzing" && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Analysis is running in the background.{" "}
              <AppLink
                href={`/courses/${courseId}/checkpoints/${checkpointId}?tab=logs`}
              >
                View logs
              </AppLink>
            </Alert>
          )}

          {checkpoint.status === "failed" && (
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Alert severity="error">
                Analysis failed.{" "}
                <AppLink
                  href={`/courses/${courseId}/checkpoints/${checkpointId}?tab=logs`}
                >
                  View logs
                </AppLink>{" "}
                or retry below.
              </Alert>
              <form action={triggerAnalysisWithIds}>
                <Button type="submit" variant="contained">
                  Retry Analysis
                </Button>
              </form>
            </Stack>
          )}

          {checkpoint.status === "complete" && (
            <>
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                <form action={discardAnalysisWithIds}>
                  <Button
                    type="submit"
                    color="warning"
                    variant="outlined"
                    size="small"
                  >
                    Discard Analysis
                  </Button>
                </form>
              </Box>

              <CheckpointGroupsPane
                groups={groupPaneData}
                courseId={courseId}
                checkpointId={checkpointId}
              />
            </>
          )}
        </Box>
      )}

      {/* Logs tab */}
      {tab === "logs" && (
        <AnalysisLogsWithRefresh
          checkpointId={checkpointId}
          initialStatus={checkpoint.status}
        />
      )}

      {/* Settings tab */}
      {tab === "settings" && (
        <Box sx={{ maxWidth: 600 }}>
          <Card variant="outlined" sx={{ borderColor: "error.main" }}>
            <CardContent>
              <Typography variant="h6" color="error" sx={{ mb: 1 }}>
                Danger Zone
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Deleting a checkpoint is irreversible.
              </Typography>
              <ConfirmDeleteButton
                title="Delete Checkpoint"
                description={`Are you sure you want to delete "${checkpoint.name}"? This action cannot be undone.`}
                action={deleteCheckpointWithIds}
                buttonLabel="Delete Checkpoint"
              />
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}
