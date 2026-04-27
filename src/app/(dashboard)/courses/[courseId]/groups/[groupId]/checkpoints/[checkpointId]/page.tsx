import AppLink from "@/components/AppLink";
import { db } from "@/lib/db";
import {
  checkpoints,
  checkpointAnalyses,
  checkpointRepoMeta,
  students,
  repositories,
  studentGroups,
  courses,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { rerunGroupAnalysis } from "@/lib/actions/checkpoints";
import {
  GroupAnalysisClient,
  type AnalysisRow,
  type RepoWarning,
} from "./GroupAnalysisClient";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";

const statusColor = {
  pending: "warning",
  analyzing: "primary",
  complete: "success",
  failed: "error",
} as const;

export default async function GroupCheckpointAnalysisPage({
  params,
}: {
  params: Promise<{
    courseId: string;
    groupId: string;
    checkpointId: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { courseId, groupId, checkpointId } = await params;

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) redirect("/courses");

  const [group] = await db
    .select()
    .from(studentGroups)
    .where(
      and(eq(studentGroups.id, groupId), eq(studentGroups.courseId, courseId))
    );

  if (!group) redirect(`/courses/${courseId}`);

  const [checkpoint] = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.id, checkpointId));

  if (!checkpoint)
    redirect(`/courses/${courseId}/groups/${groupId}/checkpoints`);

  const groupRepos = await db
    .select()
    .from(repositories)
    .where(eq(repositories.groupId, groupId));

  const repoIds = groupRepos.map((r) => r.id);

  let analysisRows: AnalysisRow[] = [];
  let repoWarnings: RepoWarning[] = [];

  if (checkpoint.status === "complete" && repoIds.length > 0) {
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

  const rerunWithIds = rerunGroupAnalysis.bind(
    null,
    checkpointId,
    groupId,
    courseId
  );

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">Home</AppLink>
        <AppLink href="/courses">Courses</AppLink>
        <AppLink href={`/courses/${courseId}`}>{course.name}</AppLink>
        <AppLink href={`/courses/${courseId}/groups/${groupId}`}>
          {group.name}
        </AppLink>
        <AppLink href={`/courses/${courseId}/groups/${groupId}/checkpoints`}>
          Checkpoints
        </AppLink>
        <Typography>{checkpoint.name}</Typography>
      </Breadcrumbs>

      <Stack direction="row" sx={{ alignItems: "center", mb: 3 }} spacing={2}>
        <Typography variant="h5">
          {group.name} — {checkpoint.name}
        </Typography>
        <Chip
          color={
            statusColor[checkpoint.status as keyof typeof statusColor] ??
            "default"
          }
          label={checkpoint.status}
        />
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>Git Ref:</strong>{" "}
              <Typography component="span" sx={{ fontFamily: "monospace" }}>
                {checkpoint.gitRef || "—"}
              </Typography>
            </Typography>
            <Typography variant="body2">
              <strong>Timestamp:</strong>{" "}
              {checkpoint.timestamp?.toLocaleString() ?? "—"}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {checkpoint.status !== "complete" && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Analysis is not complete yet.{" "}
          <AppLink href={`/courses/${courseId}/checkpoints/${checkpointId}`}>
            Manage checkpoint
          </AppLink>
        </Alert>
      )}

      {checkpoint.status === "complete" && analysisRows.length === 0 && (
        <Alert severity="info">No analysis data found for this group.</Alert>
      )}

      {checkpoint.status === "complete" && analysisRows.length > 0 && (
        <GroupAnalysisClient rows={analysisRows} warnings={repoWarnings} />
      )}

      {checkpoint.status === "complete" && (
        <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
          <form action={rerunWithIds}>
            <Button
              type="submit"
              variant="outlined"
              color="warning"
              size="small"
            >
              Re-run Analysis for This Group
            </Button>
          </form>
        </Box>
      )}
    </Box>
  );
}
