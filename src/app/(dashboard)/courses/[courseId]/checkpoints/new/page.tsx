import AppLink from "@/components/AppLink";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createCheckpoint } from "@/lib/actions/checkpoints";
import Typography from "@mui/joy/Typography";
import Breadcrumbs from "@mui/joy/Breadcrumbs";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";
import CardContent from "@mui/joy/CardContent";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Stack from "@mui/joy/Stack";
import Box from "@mui/joy/Box";

export default async function NewCheckpointPage({
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

  const createCheckpointWithCourse = createCheckpoint.bind(null, courseId);

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: "auto" }}>
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
        <Typography>New</Typography>
      </Breadcrumbs>

      <Typography level="h2" sx={{ mb: 3 }}>
        Create Checkpoint
      </Typography>

      <Card>
        <CardContent>
          <form action={createCheckpointWithCourse}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Name</FormLabel>
                <Input name="name" placeholder="Checkpoint 1" required />
              </FormControl>

              <FormControl>
                <FormLabel>Git Ref (optional)</FormLabel>
                <Input
                  name="gitRef"
                  placeholder="e.g. main, v1.0, abc123"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Timestamp (optional)</FormLabel>
                <Input name="timestamp" type="datetime-local" />
              </FormControl>

              <Button type="submit">Create Checkpoint</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
