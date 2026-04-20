import AppLink from "@/components/AppLink";
import { db } from "@/lib/db";
import {
  checkpoints,
  courses,
  studentGroups,
  repositories,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Alert from "@mui/material/Alert";

const statusColor = {
  pending: "warning",
  analyzing: "primary",
  complete: "success",
  failed: "error",
} as const;

export default async function GroupCheckpointsPage({
  params,
}: {
  params: Promise<{ courseId: string; groupId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { courseId, groupId } = await params;

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

  const repoList = await db
    .select()
    .from(repositories)
    .where(eq(repositories.groupId, groupId));

  const courseCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.courseId, courseId))
    .orderBy(checkpoints.createdAt);

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">Home</AppLink>
        <AppLink href="/courses">Courses</AppLink>
        <AppLink href={`/courses/${courseId}`}>{course.name}</AppLink>
        <AppLink href={`/courses/${courseId}/groups/${groupId}`}>
          {group.name}
        </AppLink>
        <Typography>Checkpoints</Typography>
      </Breadcrumbs>

      <Typography variant="h5" sx={{ mb: 3 }}>
        {group.name} — Checkpoints
      </Typography>

      {repoList.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          This group has no repositories. Add one from the{" "}
          <AppLink href={`/courses/${courseId}/groups/${groupId}`}>
            group page
          </AppLink>{" "}
          before running analysis.
        </Alert>
      )}

      {courseCheckpoints.length === 0 ? (
        <Alert severity="info">
          No checkpoints yet.{" "}
          <AppLink href={`/courses/${courseId}/checkpoints/new`}>
            Create one
          </AppLink>{" "}
          to get started.
        </Alert>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {courseCheckpoints.map((cp) => (
            <Card key={cp.id} variant="outlined">
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography variant="subtitle1">{cp.name}</Typography>
                    {cp.gitRef && (
                      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                        {cp.gitRef}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Chip
                      size="small"
                      color={
                        statusColor[cp.status as keyof typeof statusColor] ??
                        "default"
                      }
                      label={cp.status}
                    />
                    {cp.status === "complete" ? (
                      <AppLink
                        href={`/courses/${courseId}/groups/${groupId}/checkpoints/${cp.id}`}
                      >
                        View Analysis
                      </AppLink>
                    ) : (
                      <AppLink
                        href={`/courses/${courseId}/checkpoints/${cp.id}`}
                      >
                        Manage
                      </AppLink>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
