import ButtonLink from "@/components/ButtonLink";
import RerunButton from "@/components/RerunButton";
import CheckpointTable from "@/components/CheckpointTable";
import { db } from "@/lib/db";
import { checkpoints, courses } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { triggerAnalysis } from "@/lib/actions/checkpoints";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Typography from "@mui/material/Typography";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Add from "@mui/icons-material/Add";

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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
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
