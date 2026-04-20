import AppLink from "@/components/AppLink";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import TabNav from "@/components/TabNav";
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
import { CHECKPOINT_STATUS_COLOR } from "@/lib/constants";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import HomeRounded from "@mui/icons-material/HomeRounded";

const TABS = [
  { label: "Overview", value: "overview" },
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

  const groupsWithCounts = await Promise.all(
    groups.map(async (group) => {
      const studentList = await db
        .select()
        .from(students)
        .where(eq(students.groupId, group.id));
      return { ...group, studentCount: studentList.length };
    })
  );

  const triggerAnalysisWithIds = triggerAnalysis.bind(null, checkpointId, courseId);
  const deleteCheckpointWithIds = deleteCheckpoint.bind(null, checkpointId, courseId);
  const discardAnalysisWithIds = discardAnalysis.bind(null, checkpointId, courseId);

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">
          <HomeRounded fontSize="small" />
        </AppLink>
        <AppLink href="/courses">Courses</AppLink>
        <AppLink href={`/courses/${courseId}`}>{course.name}</AppLink>
        <AppLink href={`/courses/${courseId}?tab=checkpoints`}>Checkpoints</AppLink>
        <Typography>{checkpoint.name}</Typography>
      </Breadcrumbs>

      <Stack direction="row" sx={{ alignItems: "center", mb: 3 }} spacing={2}>
        <Typography variant="h5">{checkpoint.name}</Typography>
        <Chip
          color={CHECKPOINT_STATUS_COLOR[checkpoint.status as keyof typeof CHECKPOINT_STATUS_COLOR] ?? "default"}
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
                  <strong>Timestamp:</strong>{" "}
                  {checkpoint.timestamp?.toLocaleString() ?? "—"}
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
              Analyzing…
            </Alert>
          )}

          {checkpoint.status === "failed" && (
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Alert severity="error">Analysis failed. You can retry.</Alert>
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
                  <Button type="submit" color="warning" variant="outlined" size="small">
                    Discard Analysis
                  </Button>
                </form>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Typography variant="h6" sx={{ p: 2 }}>
                  Group Analysis
                </Typography>
                <Divider />
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Group</TableCell>
                      <TableCell>Students</TableCell>
                      <TableCell>Analysis</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groupsWithCounts.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell>
                          <AppLink href={`/courses/${courseId}/groups/${group.id}`}>
                            {group.name}
                          </AppLink>
                        </TableCell>
                        <TableCell>
                          {group.studentCount} student{group.studentCount !== 1 ? "s" : ""}
                        </TableCell>
                        <TableCell>
                          <AppLink
                            href={`/courses/${courseId}/groups/${group.id}/checkpoints/${checkpointId}`}
                          >
                            View Analysis
                          </AppLink>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
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
