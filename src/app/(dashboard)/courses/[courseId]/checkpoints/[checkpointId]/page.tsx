import AppLink from "@/components/AppLink";
import { db } from "@/lib/db";
import {
  checkpoints,
  checkpointAnalyses,
  students,
  courses,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { triggerAnalysis, deleteCheckpoint, discardAnalysis } from "@/lib/actions/checkpoints";
import { AnalysisCharts } from "./AnalysisCharts";
import Typography from "@mui/joy/Typography";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Chip from "@mui/joy/Chip";
import Sheet from "@mui/joy/Sheet";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Table from "@mui/joy/Table";
import Divider from "@mui/joy/Divider";

const statusColor = {
  pending: "warning",
  analyzing: "primary",
  complete: "success",
  failed: "danger",
} as const;

export default async function CheckpointDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; checkpointId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { courseId, checkpointId } = await params;

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

  if (!checkpoint) redirect(`/courses/${courseId}/checkpoints`);

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

  let analysisData: {
    studentName: string;
    codeMetrics: Record<string, number>;
    testMetrics: Record<string, number>;
    docMetrics: Record<string, number>;
    cicdMetrics: Record<string, number>;
  }[] = [];

  if (checkpoint.status === "complete") {
    const analyses = await db
      .select({
        codeMetrics: checkpointAnalyses.codeMetrics,
        testMetrics: checkpointAnalyses.testMetrics,
        docMetrics: checkpointAnalyses.docMetrics,
        cicdMetrics: checkpointAnalyses.cicdMetrics,
        studentName: students.displayName,
      })
      .from(checkpointAnalyses)
      .innerJoin(students, eq(students.id, checkpointAnalyses.studentId))
      .where(eq(checkpointAnalyses.checkpointId, checkpointId));

    analysisData = analyses.map((a) => ({
      studentName: a.studentName,
      codeMetrics: (a.codeMetrics as Record<string, number>) ?? {},
      testMetrics: (a.testMetrics as Record<string, number>) ?? {},
      docMetrics: (a.docMetrics as Record<string, number>) ?? {},
      cicdMetrics: (a.cicdMetrics as Record<string, number>) ?? {},
    }));
  }

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">
          Home
        </AppLink>
        <AppLink href="/courses">
          Courses
        </AppLink>
        <AppLink href={`/courses/${courseId}`}>
          {course.name}
        </AppLink>
        <AppLink
          href={`/courses/${courseId}/checkpoints`}
        >
          Checkpoints
        </AppLink>
        <Typography>{checkpoint.name}</Typography>
      </Breadcrumbs>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography level="h2">{checkpoint.name}</Typography>
            <Chip
              color={
                statusColor[
                  checkpoint.status as keyof typeof statusColor
                ] ?? "neutral"
              }
            >
              {checkpoint.status}
            </Chip>
          </Box>

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
            <Typography level="body-sm">
              <strong>Created:</strong>{" "}
              {checkpoint.createdAt?.toLocaleString() ?? "—"}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {checkpoint.status === "pending" && (
        <form action={triggerAnalysisWithIds}>
          <Button type="submit" sx={{ mb: 3 }}>
            Run Analysis
          </Button>
        </form>
      )}

      {checkpoint.status === "analyzing" && (
        <Sheet
          variant="soft"
          color="primary"
          sx={{ p: 2, borderRadius: "sm", mb: 3 }}
        >
          <Typography>Analyzing...</Typography>
        </Sheet>
      )}

      {checkpoint.status === "failed" && (
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Sheet
            variant="soft"
            color="danger"
            sx={{ p: 2, borderRadius: "sm" }}
          >
            <Typography color="danger">
              Analysis failed. You can retry.
            </Typography>
          </Sheet>
          <form action={triggerAnalysisWithIds}>
            <Button type="submit">Retry Analysis</Button>
          </form>
        </Stack>
      )}

      {checkpoint.status === "complete" && analysisData.length > 0 && (
        <>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <form action={discardAnalysisWithIds}>
              <Button type="submit" color="warning" variant="soft" size="sm">
                Discard Analysis
              </Button>
            </form>
          </Box>
          <AnalysisCharts data={analysisData} />

          <Sheet
            variant="outlined"
            sx={{ borderRadius: "sm", mt: 3 }}
          >
            <Typography level="title-lg" sx={{ p: 2 }}>
              Summary
            </Typography>
            <Divider />
            <Table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th style={{ textAlign: "right" }}>Commits</th>
                  <th style={{ textAlign: "right" }}>Code +/-</th>
                  <th style={{ textAlign: "right" }}>Test +/-</th>
                  <th style={{ textAlign: "right" }}>Docs +/-</th>
                  <th style={{ textAlign: "right" }}>CI/CD +/-</th>
                </tr>
              </thead>
              <tbody>
                {analysisData.map((a, i) => (
                  <tr key={i}>
                    <td>{a.studentName}</td>
                    <td style={{ textAlign: "right" }}>
                      {a.codeMetrics.commits ?? 0}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      +{a.codeMetrics.linesAdded ?? 0} / -
                      {a.codeMetrics.linesRemoved ?? 0}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      +{a.testMetrics.linesAdded ?? 0} / -
                      {a.testMetrics.linesRemoved ?? 0}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      +{a.docMetrics.linesAdded ?? 0} / -
                      {a.docMetrics.linesRemoved ?? 0}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      +{a.cicdMetrics.linesAdded ?? 0} / -
                      {a.cicdMetrics.linesRemoved ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Sheet>
        </>
      )}

      {checkpoint.status === "complete" && analysisData.length === 0 && (
        <Sheet
          variant="soft"
          sx={{ p: 4, borderRadius: "sm", textAlign: "center" }}
        >
          <Typography sx={{ mb: 2 }}>Analysis complete but no data found.</Typography>
          <form action={discardAnalysisWithIds}>
            <Button type="submit" color="warning" variant="soft" size="sm">
              Discard Analysis
            </Button>
          </form>
        </Sheet>
      )}

      <Divider sx={{ my: 4 }} />

      <Card variant="soft" color="danger">
        <CardContent>
          <Typography level="title-md" sx={{ mb: 1 }}>
            Danger Zone
          </Typography>
          <Typography level="body-sm" sx={{ mb: 2 }}>
            Deleting a checkpoint is irreversible.
          </Typography>
          <form action={deleteCheckpointWithIds}>
            <Button type="submit" color="danger" variant="solid">
              Delete Checkpoint
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
