import AppLink from "@/components/AppLink";
import { db } from "@/lib/db";
import { checkpoints, courses, studentGroups, students } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  triggerAnalysis,
  deleteCheckpoint,
  discardAnalysis,
} from "@/lib/actions/checkpoints";
import Typography from "@mui/joy/Typography";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import Chip from "@mui/joy/Chip";
import Sheet from "@mui/joy/Sheet";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Divider from "@mui/joy/Divider";
import Table from "@mui/joy/Table";

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

  const groups = await db
    .select()
    .from(studentGroups)
    .where(eq(studentGroups.courseId, courseId));

  const groupsWithCounts = await Promise.all(
    groups.map(async (group) => {
      const studentList = await db
        .select()
        .from(students)
        .where(eq(students.groupId, group.id));
      return { ...group, studentCount: studentList.length };
    })
  );

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
        <AppLink href="/">Home</AppLink>
        <AppLink href="/courses">Courses</AppLink>
        <AppLink href={`/courses/${courseId}`}>{course.name}</AppLink>
        <AppLink href={`/courses/${courseId}/checkpoints`}>Checkpoints</AppLink>
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
                statusColor[checkpoint.status as keyof typeof statusColor] ??
                "neutral"
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

      {checkpoint.status === "complete" && (
        <>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <form action={discardAnalysisWithIds}>
              <Button type="submit" color="warning" variant="soft" size="sm">
                Discard Analysis
              </Button>
            </form>
          </Box>

          <Sheet variant="outlined" sx={{ borderRadius: "sm", mb: 3 }}>
            <Typography level="title-lg" sx={{ p: 2 }}>
              Group Analysis
            </Typography>
            <Divider />
            <Table>
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Students</th>
                  <th>Analysis</th>
                </tr>
              </thead>
              <tbody>
                {groupsWithCounts.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <AppLink href={`/courses/${courseId}/groups/${group.id}`}>
                        {group.name}
                      </AppLink>
                    </td>
                    <td>
                      {group.studentCount} student
                      {group.studentCount !== 1 ? "s" : ""}
                    </td>
                    <td>
                      <AppLink
                        href={`/courses/${courseId}/groups/${group.id}/checkpoints/${checkpointId}`}
                      >
                        View Analysis
                      </AppLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Sheet>
        </>
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
