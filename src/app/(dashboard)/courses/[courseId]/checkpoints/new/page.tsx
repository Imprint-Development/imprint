import AppLink from "@/components/AppLink";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createCheckpoint } from "@/lib/actions/checkpoints";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import FormHelperText from "@mui/material/FormHelperText";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";

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

      <Typography variant="h5" sx={{ mb: 3 }}>
        Create Checkpoint
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover", mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          How checkpoints work
        </Typography>
        <Typography variant="body2">
          A checkpoint captures each student&apos;s contribution up to a
          specific point in time. When you run the analysis, Imprint clones
          every group repository, checks out the configured branch, and counts
          commits and lines changed — considering only commits whose{" "}
          <strong>committer date</strong> is on or before the deadline.
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="body2">
          <strong>Typical setup for a submission deadline:</strong> set{" "}
          <em>Branch / ref</em> to <code>main</code> and <em>Deadline</em> to
          the exact cutoff date and time. Commits pushed after the deadline will
          be excluded regardless of what the author date says. Leave both fields
          blank to analyse the full history of the default branch.
        </Typography>
      </Paper>

      <Card>
        <CardContent>
          <form action={createCheckpointWithCourse}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>Name</FormLabel>
                <TextField
                  name="name"
                  placeholder="Checkpoint 1"
                  required
                  size="small"
                  fullWidth
                />
                <FormHelperText>
                  A short label shown in the course overview, e.g.
                  &quot;Milestone 1&quot; or &quot;Final submission&quot;.
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Branch / ref (optional)</FormLabel>
                <TextField
                  name="gitRef"
                  placeholder="e.g. main, develop, v1.0"
                  size="small"
                  fullWidth
                />
                <FormHelperText>
                  Branch name, tag, or commit SHA to check out before reading
                  history. Defaults to the repository&apos;s default branch if
                  left blank.
                </FormHelperText>
              </FormControl>

              <FormControl>
                <FormLabel>Deadline (optional)</FormLabel>
                <TextField
                  name="timestamp"
                  type="datetime-local"
                  size="small"
                  fullWidth
                />
                <FormHelperText>
                  Only commits whose committer date is on or before this
                  datetime are counted. Leave blank to include all commits on
                  the selected branch.
                </FormHelperText>
              </FormControl>

              <Button type="submit" variant="contained">
                Create Checkpoint
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
