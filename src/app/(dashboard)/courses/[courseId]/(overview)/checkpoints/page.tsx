import ButtonLink from "@/components/ButtonLink";
import RerunButton from "@/components/RerunButton";
import CheckpointTable from "@/components/CheckpointTable";
import { db } from "@/lib/db";
import { checkpoints } from "@/lib/db/schema";
import { triggerAnalysis } from "@/lib/actions/checkpoints";
import { eq } from "drizzle-orm";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Add from "@mui/icons-material/Add";

export default async function CheckpointsTabPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const courseCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.courseId, courseId))
    .orderBy(checkpoints.createdAt);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Checkpoints</Typography>
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
        <CheckpointTable
          checkpoints={courseCheckpoints}
          href={(cp) => `/courses/${courseId}/checkpoints/${cp.id}`}
          columns={{ gitRef: true, startDate: true, endDate: true }}
          renderActions={(cp) =>
            cp.status !== "analyzing" ? (
              <RerunButton
                action={triggerAnalysis.bind(null, cp.id, courseId)}
                enabledPipelines={cp.enabledPipelines ?? []}
                isPending={cp.status === "pending"}
              />
            ) : null
          }
        />
      )}
    </Box>
  );
}
