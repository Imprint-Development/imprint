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
import PageBreadcrumbs from "@/components/PageBreadcrumbs";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Alert from "@mui/material/Alert";
import NextLink from "next/link";

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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageBreadcrumbs
        items={[
          { label: "Groups", href: `/courses/${courseId}/groups` },
          {
            label: group.name,
            href: `/courses/${courseId}/groups/${groupId}`,
          },
          { label: "Checkpoints" },
        ]}
      />

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
          {courseCheckpoints.map((cp) => {
            const href =
              cp.status === "complete"
                ? `/courses/${courseId}/checkpoints/${cp.id}?tab=analysis&group=${groupId}`
                : `/courses/${courseId}/checkpoints/${cp.id}`;
            return (
              <Card key={cp.id} variant="outlined">
                <CardActionArea component={NextLink} href={href}>
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
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: "monospace" }}
                          >
                            {cp.gitRef}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        size="small"
                        color={
                          statusColor[cp.status as keyof typeof statusColor] ??
                          "default"
                        }
                        label={cp.status}
                      />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
