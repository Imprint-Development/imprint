import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, courseCollaborators } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createGroup } from "@/lib/actions/groups";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import TextField from "@mui/material/TextField";
import PageBreadcrumbs from "@/components/PageBreadcrumbs";

export default async function NewGroupPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [membership] = await db
    .select()
    .from(courseCollaborators)
    .where(
      and(
        eq(courseCollaborators.courseId, courseId),
        eq(courseCollaborators.userId, session.user.id)
      )
    );
  if (!membership) redirect("/courses");

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId));
  if (!course) redirect("/courses");

  const createGroupWithId = createGroup.bind(null, courseId);

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <PageBreadcrumbs
        items={[
          { label: "Groups", href: `/courses/${courseId}/groups` },
          { label: "New Group" },
        ]}
      />

      <Typography variant="h5" sx={{ mb: 3 }}>
        Create Group
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <form action={createGroupWithId}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Group Name</FormLabel>
                <TextField
                  name="name"
                  placeholder="e.g. Team Alpha"
                  size="small"
                  fullWidth
                />
              </FormControl>
              <Button type="submit" variant="contained">
                Create Group
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
