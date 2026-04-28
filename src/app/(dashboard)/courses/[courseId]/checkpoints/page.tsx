import AppLink from "@/components/AppLink";
import ButtonLink from "@/components/ButtonLink";
import RerunButton from "@/components/RerunButton";
import { db } from "@/lib/db";
import { checkpoints, courses } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { triggerAnalysis } from "@/lib/actions/checkpoints";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Typography from "@mui/material/Typography";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Add from "@mui/icons-material/Add";

const statusColor = {
  pending: "warning",
  analyzing: "primary",
  complete: "success",
  failed: "error",
} as const;

export default async function CheckpointsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { courseId } = await params;

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) redirect("/courses");

  const courseCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.courseId, courseId))
    .orderBy(checkpoints.createdAt);

  return (
    <Box sx={{ p: 3 }}>
      <PageBreadcrumbs items={[{ label: "Checkpoints" }]} />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5">Checkpoints</Typography>
        <ButtonLink
          href={`/courses/${courseId}/checkpoints/new`}
          startIcon={<Add />}
        >
          Create Checkpoint
        </ButtonLink>
      </Box>

      {courseCheckpoints.length === 0 ? (
        <Alert severity="info">
          No checkpoints yet. Create one to get started.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Git Ref</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {courseCheckpoints.map((cp) => (
                <TableRow key={cp.id}>
                  <TableCell>{cp.name}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "monospace" }}
                    >
                      {cp.gitRef ?? "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={
                        statusColor[cp.status as keyof typeof statusColor] ??
                        "default"
                      }
                      label={cp.status}
                    />
                  </TableCell>
                  <TableCell>
                    {cp.startDate
                      ? new Date(cp.startDate).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {cp.endDate
                      ? new Date(cp.endDate).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center" }}
                    >
                      <AppLink
                        href={`/courses/${courseId}/checkpoints/${cp.id}`}
                      >
                        View
                      </AppLink>
                      {cp.status !== "analyzing" && (
                        <RerunButton
                          action={triggerAnalysis.bind(null, cp.id, courseId)}
                          enabledPipelines={cp.enabledPipelines}
                          isPending={cp.status === "pending"}
                        />
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
