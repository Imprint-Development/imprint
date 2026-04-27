import AppLink from "@/components/AppLink";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import TabNav from "@/components/TabNav";
import AnalysisLogsWithRefresh from "@/components/AnalysisLogsWithRefresh";
import CheckpointGroupsPane, {
  type GroupPaneData,
} from "./CheckpointGroupsPane";
import RunAnalysisForm from "./RunAnalysisForm";
import { db } from "@/lib/db";
import { ALL_PIPELINE_IDS } from "@/lib/analysis/pipelines/registry";
import {
  checkpoints,
  courses,
  studentGroups,
  students,
  repositories,
  checkpointAnalyses,
  checkpointRepoMeta,
  checkpointLogs,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { triggerAnalysis, deleteCheckpoint } from "@/lib/actions/checkpoints";
import { CHECKPOINT_STATUS_COLOR } from "@/lib/constants";
import type {
  AnalysisRow,
  RepoWarning,
} from "../../groups/[groupId]/checkpoints/[checkpointId]/GroupAnalysisClient";
import Typography from "@mui/material/Typography";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

const TABS = [
  { label: "Overview", value: "overview" },
  { label: "Analysis", value: "analysis" },
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
        let analysedAt: Date | null = null;

        // Fetch distinct pipelines that produced logs for this group
        const logRows = await db
          .selectDistinct({ pipeline: checkpointLogs.pipeline })
          .from(checkpointLogs)
          .where(
            and(
              eq(checkpointLogs.checkpointId, checkpointId),
              eq(checkpointLogs.groupId, group.id)
            )
          );
        const executedPipelines = logRows.map((r) => r.pipeline);

        if (repoIds.length > 0) {
          const analyses = await db
            .select({
              codeMetrics: checkpointAnalyses.codeMetrics,
              testMetrics: checkpointAnalyses.testMetrics,
              reviewMetrics: checkpointAnalyses.reviewMetrics,
              studentName: students.displayName,
              repoId: repositories.id,
              repoUrl: repositories.url,
              createdAt: checkpointAnalyses.createdAt,
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

          analysedAt = analyses.reduce<Date | null>((max, a) => {
            if (!a.createdAt) return max;
            if (!max || a.createdAt > max) return a.createdAt;
            return max;
          }, null);

          analysisRows = analyses.map((a) => ({
            studentName: a.studentName,
            repoId: a.repoId,
            repoUrl: a.repoUrl,
            codeMetrics: (a.codeMetrics as Record<string, number>) ?? {},
            testMetrics: (a.testMetrics as Record<string, number>) ?? {},
            reviewMetrics: (a.reviewMetrics as Record<string, number>) ?? {},
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
          analysedAt,
          executedPipelines,
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
          analysedAt: null,
          executedPipelines: [],
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

  // Most recent analysis run across all groups
  const lastRunAt = groupPaneData.reduce<Date | null>((max, g) => {
    if (!g.analysedAt) return max;
    if (!max || g.analysedAt > max) return g.analysedAt;
    return max;
  }, null);

  // Distinct pipelines executed across all groups in the last run
  const executedPipelines = [
    ...new Set(groupPaneData.flatMap((g) => g.executedPipelines)),
  ];

  return (
    <Box sx={{ p: 3 }}>
      <PageBreadcrumbs
        items={[
          {
            label: "Checkpoints",
            href: `/courses/${courseId}/checkpoints`,
          },
          { label: checkpoint.name },
        ]}
      />

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

      {/* Overview tab — details + last run timestamp + logs */}
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
                  <strong>Last Run:</strong>{" "}
                  {lastRunAt ? lastRunAt.toLocaleString() : "—"}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Pipelines run:</strong>
                  </Typography>
                  {executedPipelines.length > 0 ? (
                    executedPipelines.map((p) => (
                      <Chip key={p} label={p} size="small" variant="outlined" />
                    ))
                  ) : (
                    <Typography variant="body2">—</Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <AnalysisLogsWithRefresh
            checkpointId={checkpointId}
            groups={groups.map((g) => ({ id: g.id, name: g.name }))}
            pipelines={ALL_PIPELINE_IDS}
            initialStatus={checkpoint.status}
          />
        </Box>
      )}

      {/* Analysis tab — action buttons + groups pane */}
      {tab === "analysis" && (
        <Box>
          {checkpoint.status === "pending" && (
            <RunAnalysisForm
              action={triggerAnalysisWithIds}
              enabledPipelines={checkpoint.enabledPipelines}
              submitLabel="Run Analysis"
            />
          )}

          {checkpoint.status === "analyzing" && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Analysis is running in the background.{" "}
              <AppLink
                href={`/courses/${courseId}/checkpoints/${checkpointId}?tab=overview`}
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
                  href={`/courses/${courseId}/checkpoints/${checkpointId}?tab=overview`}
                >
                  View logs
                </AppLink>{" "}
                or retry below.
              </Alert>
              <RunAnalysisForm
                action={triggerAnalysisWithIds}
                enabledPipelines={checkpoint.enabledPipelines}
                submitLabel="Retry Analysis"
              />
            </Stack>
          )}

          {checkpoint.status === "complete" && (
            <CheckpointGroupsPane
              groups={groupPaneData}
              courseId={courseId}
              checkpointId={checkpointId}
            />
          )}
        </Box>
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
