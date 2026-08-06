import AppLink from "@/components/AppLink";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import RerunButton from "@/components/RerunButton";
import TabNav from "@/components/TabNav";
import AnalysisLogsWithRefresh from "@/components/AnalysisLogsWithRefresh";
import CheckpointGroupsPane, {
  type GroupPaneData,
  type WarnLog,
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
  aiReports,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, inArray, or, max, like, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { triggerAnalysis, deleteCheckpoint } from "@/lib/actions/checkpoints";
import { CHECKPOINT_STATUS_COLOR } from "@/lib/constants";
import type {
  AnalysisRow,
  RepoWarning,
  ReviewWarning,
} from "@/lib/types/analysis";
import type { AiReportRow } from "./AiReportsSection";
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
  searchParams: Promise<{ tab?: string; group?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { courseId, checkpointId } = await params;
  const { tab = "overview", group: initialGroupId } = await searchParams;

  // Parallel fetch: course, checkpoint, and groups in one round-trip each
  const [[course], [checkpoint], groups] = await Promise.all([
    db.select().from(courses).where(eq(courses.id, courseId)).limit(1),
    db
      .select()
      .from(checkpoints)
      .where(eq(checkpoints.id, checkpointId))
      .limit(1),
    db.select().from(studentGroups).where(eq(studentGroups.courseId, courseId)),
  ]);

  if (!course) redirect("/courses");
  if (!checkpoint) redirect(`/courses/${courseId}?tab=checkpoints`);

  const groupIds = groups.map((g) => g.id);

  // Build per-group analysis pane data
  let groupPaneData: GroupPaneData[] = [];

  if (groupIds.length === 0) {
    // No groups yet — nothing to query
    groupPaneData = [];
  } else if (checkpoint.status === "complete") {
    // ── Batch round 1: 6 queries in parallel, all keyed by groupId ──────────
    const [
      allStudents,
      allRepos,
      pipelineRows,
      runStartRows,
      allWarnLogRows,
      allAiReportRows,
    ] = await Promise.all([
      db.select().from(students).where(inArray(students.groupId, groupIds)),
      db
        .select()
        .from(repositories)
        .where(inArray(repositories.groupId, groupIds)),
      db
        .selectDistinct({
          pipeline: checkpointLogs.pipeline,
          groupId: checkpointLogs.groupId,
        })
        .from(checkpointLogs)
        .where(
          and(
            eq(checkpointLogs.checkpointId, checkpointId),
            inArray(checkpointLogs.groupId, groupIds)
          )
        ),
      db
        .select({
          groupId: checkpointLogs.groupId,
          runStart: max(checkpointLogs.createdAt),
        })
        .from(checkpointLogs)
        .where(
          and(
            eq(checkpointLogs.checkpointId, checkpointId),
            inArray(checkpointLogs.groupId, groupIds),
            eq(checkpointLogs.level, "info"),
            like(checkpointLogs.message, "Starting%")
          )
        )
        .groupBy(checkpointLogs.groupId),
      db
        .select({
          groupId: checkpointLogs.groupId,
          pipeline: checkpointLogs.pipeline,
          level: checkpointLogs.level,
          message: checkpointLogs.message,
          repoUrl: repositories.url,
          createdAt: checkpointLogs.createdAt,
        })
        .from(checkpointLogs)
        .leftJoin(
          repositories,
          eq(repositories.id, checkpointLogs.repositoryId)
        )
        .where(
          and(
            eq(checkpointLogs.checkpointId, checkpointId),
            inArray(checkpointLogs.groupId, groupIds),
            or(
              eq(checkpointLogs.level, "warn"),
              eq(checkpointLogs.level, "error")
            )
          )
        ),
      db
        .select({
          id: aiReports.id,
          studentId: aiReports.studentId,
          studentName: students.displayName,
          content: aiReports.content,
          provider: aiReports.provider,
          model: aiReports.model,
          createdAt: aiReports.createdAt,
          groupId: aiReports.groupId,
        })
        .from(aiReports)
        .leftJoin(students, eq(students.id, aiReports.studentId))
        .where(
          and(
            eq(aiReports.checkpointId, checkpointId),
            inArray(aiReports.groupId, groupIds)
          )
        )
        .orderBy(desc(aiReports.createdAt)),
    ]);

    // Build lookup maps from round-1 results
    const studentsByGroup = new Map<string, typeof allStudents>();
    for (const s of allStudents) {
      const arr = studentsByGroup.get(s.groupId);
      if (arr) arr.push(s);
      else studentsByGroup.set(s.groupId, [s]);
    }

    const repoToGroup = new Map<string, string>();
    const allRepoIds: string[] = [];
    for (const r of allRepos) {
      repoToGroup.set(r.id, r.groupId);
      allRepoIds.push(r.id);
    }

    const pipelinesByGroup = new Map<string, string[]>();
    for (const row of pipelineRows) {
      if (!row.groupId) continue;
      const arr = pipelinesByGroup.get(row.groupId);
      if (arr) arr.push(row.pipeline);
      else pipelinesByGroup.set(row.groupId, [row.pipeline]);
    }

    const runStartByGroup = new Map<string, Date>();
    for (const row of runStartRows) {
      if (row.groupId && row.runStart)
        runStartByGroup.set(row.groupId, row.runStart);
    }

    const aiReportsByGroup = new Map<string, AiReportRow[]>();
    for (const r of allAiReportRows) {
      if (!r.groupId) continue;
      const arr = aiReportsByGroup.get(r.groupId) ?? [];
      arr.push({
        id: r.id,
        studentId: r.studentId,
        studentName: r.studentName ?? null,
        content: r.content,
        provider: r.provider,
        model: r.model,
        createdAt: r.createdAt,
      });
      aiReportsByGroup.set(r.groupId, arr);
    }

    // ── Batch round 2: 3 queries in parallel, keyed by repoId ───────────────
    const analysesPromise =
      allRepoIds.length > 0
        ? db
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
                inArray(checkpointAnalyses.repositoryId, allRepoIds)
              )
            )
        : Promise.resolve(
            [] as {
              codeMetrics: unknown;
              testMetrics: unknown;
              reviewMetrics: unknown;
              studentName: string;
              repoId: string;
              repoUrl: string;
              createdAt: Date | null;
            }[]
          );

    const metaPromise =
      allRepoIds.length > 0
        ? db
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
                inArray(checkpointRepoMeta.repositoryId, allRepoIds)
              )
            )
        : Promise.resolve(
            [] as {
              repoId: string;
              repoUrl: string;
              unidentifiedAuthors: string[];
            }[]
          );

    const reviewWarnPromise =
      allRepoIds.length > 0
        ? db
            .select({
              message: checkpointLogs.message,
              repoId: repositories.id,
              repoUrl: repositories.url,
            })
            .from(checkpointLogs)
            .innerJoin(
              repositories,
              eq(repositories.id, checkpointLogs.repositoryId)
            )
            .where(
              and(
                eq(checkpointLogs.checkpointId, checkpointId),
                inArray(checkpointLogs.groupId, groupIds),
                eq(checkpointLogs.pipeline, "review"),
                eq(checkpointLogs.level, "warn"),
                inArray(checkpointLogs.repositoryId, allRepoIds)
              )
            )
        : Promise.resolve(
            [] as { message: string; repoId: string; repoUrl: string }[]
          );

    const [allAnalyses, allMetaRows, allReviewWarnLogs] = await Promise.all([
      analysesPromise,
      metaPromise,
      reviewWarnPromise,
    ]);

    // Group round-2 results by groupId via the repoToGroup map
    const analysesByGroup = new Map<string, typeof allAnalyses>();
    for (const a of allAnalyses) {
      const gId = repoToGroup.get(a.repoId);
      if (!gId) continue;
      const arr = analysesByGroup.get(gId);
      if (arr) arr.push(a);
      else analysesByGroup.set(gId, [a]);
    }

    const metaByGroup = new Map<string, typeof allMetaRows>();
    for (const m of allMetaRows) {
      const gId = repoToGroup.get(m.repoId);
      if (!gId) continue;
      const arr = metaByGroup.get(gId);
      if (arr) arr.push(m);
      else metaByGroup.set(gId, [m]);
    }

    const reviewWarnByGroup = new Map<string, typeof allReviewWarnLogs>();
    for (const r of allReviewWarnLogs) {
      const gId = repoToGroup.get(r.repoId);
      if (!gId) continue;
      const arr = reviewWarnByGroup.get(gId);
      if (arr) arr.push(r);
      else reviewWarnByGroup.set(gId, [r]);
    }

    // Assemble groupPaneData without any further per-group queries
    groupPaneData = groups.map((group) => {
      const groupStudents = studentsByGroup.get(group.id) ?? [];
      const executedPipelines = pipelinesByGroup.get(group.id) ?? [];
      const runStart = runStartByGroup.get(group.id) ?? null;

      // Filter warn/error logs to the latest run for this group (in JS)
      const groupWarnRows = allWarnLogRows.filter(
        (r) =>
          r.groupId === group.id &&
          (runStart === null ||
            (r.createdAt !== null && r.createdAt >= runStart))
      );
      const warnLogs: WarnLog[] = groupWarnRows.map((r) => ({
        pipeline: r.pipeline,
        level: r.level,
        message: r.message,
        repoUrl: r.repoUrl ?? null,
      }));

      const groupAnalyses = analysesByGroup.get(group.id) ?? [];
      const analysedAt = groupAnalyses.reduce<Date | null>((mx, a) => {
        if (!a.createdAt) return mx;
        if (!mx || a.createdAt > mx) return a.createdAt;
        return mx;
      }, null);
      const analysisRows: AnalysisRow[] = groupAnalyses.map((a) => ({
        studentName: a.studentName,
        repoId: a.repoId,
        repoUrl: a.repoUrl,
        codeMetrics: (a.codeMetrics as Record<string, number>) ?? {},
        testMetrics: (a.testMetrics as Record<string, number>) ?? {},
        reviewMetrics: (a.reviewMetrics as Record<string, number>) ?? {},
      }));

      const groupMeta = metaByGroup.get(group.id) ?? [];
      const repoWarnings: RepoWarning[] = groupMeta
        .filter((m) => (m.unidentifiedAuthors as string[]).length > 0)
        .map((m) => ({
          repoId: m.repoId,
          repoUrl: m.repoUrl,
          unidentifiedAuthors: m.unidentifiedAuthors as string[],
        }));

      const groupReviewWarnLogs = reviewWarnByGroup.get(group.id) ?? [];
      const reviewWarnings: ReviewWarning[] = groupReviewWarnLogs.map((r) => ({
        repoId: r.repoId,
        repoUrl: r.repoUrl,
        message: r.message,
      }));

      return {
        groupId: group.id,
        groupName: group.name,
        studentCount: groupStudents.length,
        analysedAt,
        executedPipelines,
        analysisRows,
        repoWarnings,
        reviewWarnings,
        logWarningCount: warnLogs.length,
        warnLogs,
        aiReports: aiReportsByGroup.get(group.id) ?? [],
        checkpointStatus: checkpoint.status,
      };
    });
  } else {
    // Non-complete: one query for student counts across all groups
    const allStudents = await db
      .select({ groupId: students.groupId })
      .from(students)
      .where(inArray(students.groupId, groupIds));

    const studentCountMap = new Map<string, number>();
    for (const s of allStudents) {
      studentCountMap.set(s.groupId, (studentCountMap.get(s.groupId) ?? 0) + 1);
    }

    groupPaneData = groups.map((group) => ({
      groupId: group.id,
      groupName: group.name,
      studentCount: studentCountMap.get(group.id) ?? 0,
      analysedAt: null,
      executedPipelines: [],
      analysisRows: [],
      repoWarnings: [],
      reviewWarnings: [] as ReviewWarning[],
      logWarningCount: 0,
      warnLogs: [],
      aiReports: [],
      checkpointStatus: checkpoint.status,
    }));
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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
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
        {checkpoint.status !== "analyzing" && (
          <RerunButton
            action={triggerAnalysisWithIds}
            enabledPipelines={checkpoint.enabledPipelines}
            isPending={checkpoint.status === "pending"}
          />
        )}
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
              checkpointName={checkpoint.name}
              checkpointStatus={checkpoint.status}
              initialGroupId={initialGroupId}
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
