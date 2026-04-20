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
import { RepoTabs } from "@/app/(dashboard)/courses/[courseId]/checkpoints/[checkpointId]/RepoTabs";
import type {
  AnalysisRow,
  RepoWarning,
} from "@/app/(dashboard)/courses/[courseId]/checkpoints/[checkpointId]/RepoTabs";
import Typography from "@mui/joy/Typography";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Box from "@mui/joy/Box";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Chip from "@mui/joy/Chip";
import Sheet from "@mui/joy/Sheet";
import Stack from "@mui/joy/Stack";

const statusColor = {
  pending: "warning",
  analyzing: "primary",
  complete: "success",
  failed: "danger",
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

      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Typography level="h2">
          {group.name} — {checkpoint.name}
        </Typography>
        <Chip
          color={
            statusColor[checkpoint.status as keyof typeof statusColor] ??
            "neutral"
          }
        >
          {checkpoint.status}
        </Chip>
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={1}>
            <Typography level="body-sm">
              <strong>Git Ref:</strong>{" "}
              <Typography fontFamily="code">
                {checkpoint.gitRef || "—"}
              </Typography>
            </Typography>
            <Typography level="body-sm">
              <strong>Timestamp:</strong>{" "}
              {checkpoint.timestamp?.toLocaleString() ?? "—"}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {checkpoint.status !== "complete" && (
        <Sheet variant="soft" color="neutral" sx={{ p: 3, borderRadius: "sm" }}>
          <Typography>
            Analysis is not complete yet.{" "}
            <AppLink href={`/courses/${courseId}/checkpoints/${checkpointId}`}>
              Manage checkpoint
            </AppLink>
          </Typography>
        </Sheet>
      )}

      {checkpoint.status === "complete" && analysisRows.length === 0 && (
        <Sheet
          variant="soft"
          sx={{ p: 4, borderRadius: "sm", textAlign: "center" }}
        >
          <Typography>No analysis data found for this group.</Typography>
        </Sheet>
      )}

      {checkpoint.status === "complete" && analysisRows.length > 0 && (
        <RepoTabs rows={analysisRows} warnings={repoWarnings} />
      )}
    </Box>
  );
}
