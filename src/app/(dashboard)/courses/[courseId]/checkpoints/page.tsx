import AppLink from "@/components/AppLink";
import ButtonLink from "@/components/ButtonLink";
import { db } from "@/lib/db";
import { checkpoints, courses } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Typography from "@mui/joy/Typography";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Chip from "@mui/joy/Chip";
import Sheet from "@mui/joy/Sheet";
import Table from "@mui/joy/Table";
import Box from "@mui/joy/Box";
import Add from "@mui/icons-material/Add";

const statusColor = {
  pending: "warning",
  analyzing: "primary",
  complete: "success",
  failed: "danger",
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
        <Typography>Checkpoints</Typography>
      </Breadcrumbs>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography level="h2">Checkpoints</Typography>
        <ButtonLink
          href={`/courses/${courseId}/checkpoints/new`}
          startDecorator={<Add />}
        >
          Create Checkpoint
        </ButtonLink>
      </Box>

      {courseCheckpoints.length === 0 ? (
        <Sheet
          variant="soft"
          sx={{ p: 4, borderRadius: "sm", textAlign: "center" }}
        >
          <Typography>
            No checkpoints yet. Create one to get started.
          </Typography>
        </Sheet>
      ) : (
        <Sheet variant="outlined" sx={{ borderRadius: "sm" }}>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Git Ref</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courseCheckpoints.map((cp) => (
                <tr key={cp.id}>
                  <td>{cp.name}</td>
                  <td>
                    <Typography level="body-sm" fontFamily="code">
                      {cp.gitRef ?? "—"}
                    </Typography>
                  </td>
                  <td>
                    <Chip
                      size="sm"
                      color={
                        statusColor[
                          cp.status as keyof typeof statusColor
                        ] ?? "neutral"
                      }
                    >
                      {cp.status}
                    </Chip>
                  </td>
                  <td>
                    {cp.createdAt
                      ? new Date(cp.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <AppLink
                      href={`/courses/${courseId}/checkpoints/${cp.id}`}
                    >
                      View
                    </AppLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Sheet>
      )}
    </Box>
  );
}
