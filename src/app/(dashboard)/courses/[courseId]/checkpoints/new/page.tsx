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
import FormHelperText from "@mui/joy/FormHelperText";
import Input from "@mui/joy/Input";
import Stack from "@mui/joy/Stack";
import Box from "@mui/joy/Box";
import Divider from "@mui/joy/Divider";
import Sheet from "@mui/joy/Sheet";

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
    <Box sx={{ p: 3, maxWidth: 640, mx: "auto" }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <AppLink href="/">Home</AppLink>
        <AppLink href="/courses">Courses</AppLink>
        <AppLink href={`/courses/${courseId}`}>{course.name}</AppLink>
        <AppLink href={`/courses/${courseId}/checkpoints`}>Checkpoints</AppLink>
        <Typography>New</Typography>
      </Breadcrumbs>

      <Typography level="h2" sx={{ mb: 3 }}>
        Create Checkpoint
      </Typography>

      <Sheet
        variant="soft"
        color="neutral"
        sx={{ p: 2, borderRadius: "sm", mb: 3 }}
      >
        <Typography level="title-sm" sx={{ mb: 1 }}>
          How checkpoints work
        </Typography>
        <Typography level="body-sm">
          A checkpoint captures each student&apos;s contribution up to a
          specific point in time. When you run the analysis, Imprint clones
          every group repository, checks out the configured branch, and counts
          commits and lines changed — considering only commits whose{" "}
          <strong>committer date</strong> is on or before the deadline.
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        <Typography level="body-sm">
          <strong>Typical setup for a submission deadline:</strong> set{" "}
          <em>Branch / ref</em> to <code>main</code> and <em>Deadline</em> to
          the exact cutoff date and time. Commits pushed after the deadline will
          be excluded regardless of what the author date says. Leave both fields
          blank to analyse the full history of the default branch.
        </Typography>
      </Sheet>

      <Card>
        <CardContent>
          <form action={createCheckpointWithCourse}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Name</FormLabel>
                <Input name="name" placeholder="Checkpoint 1" required />
                <FormHelperText>
                  A short label shown in the course overview, e.g.
                  &quot;Milestone 1&quot; or &quot;Final submission&quot;.
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Branch / ref (optional)</FormLabel>
                <Input name="gitRef" placeholder="e.g. main, develop, v1.0" />
                <FormHelperText>
                  Branch name, tag, or commit SHA to check out before reading
                  history. Defaults to the repository&apos;s default branch if
                  left blank.
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Deadline (optional)</FormLabel>
                <Input name="timestamp" type="datetime-local" />
                <FormHelperText>
                  Only commits whose committer date is on or before this
                  datetime are counted. Leave blank to include all commits on
                  the selected branch.
                </FormHelperText>
              </FormControl>

              <Button type="submit">Create Checkpoint</Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
